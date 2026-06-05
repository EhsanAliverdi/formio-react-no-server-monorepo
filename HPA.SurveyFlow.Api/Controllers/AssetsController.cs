using System.Text.Json;
using HPA.SurveyFlow.Api.Authorization;
using HPA.SurveyFlow.Api.Extensions;
using HPA.SurveyFlow.Domain.Entities;
using HPA.SurveyFlow.Domain.Security;
using HPA.SurveyFlow.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Quartz;

namespace HPA.SurveyFlow.Api.Controllers;

[ApiController]
[Route("api/assets")]
public class AssetsController(AppDbContext db, ISchedulerFactory schedulerFactory) : ControllerBase
{
    [HttpGet("tree")]
    [RequirePermission(Permissions.Jobs.Read)]
    public async Task<IActionResult> GetAssetTree(
        [FromQuery] string? source = null,
        [FromQuery] string? q = null,
        [FromQuery] bool? isActive = null,
        [FromQuery] string? category = null)
    {
        var query = FilterAssets(source, q: null, isActive, category);
        var all = await query
            .OrderBy(a => a.DisplayName)
            .Select(a => new AssetNode
            {
                Id = a.Id,
                ExternalId = a.ExternalId,
                ParentExternalId = a.ParentExternalId,
                DisplayName = a.DisplayName,
                Category = a.Category,
                Location = a.Location,
                IsActive = a.IsActive,
                Source = a.Source,
                LastSyncedAt = a.LastSyncedAt,
                SourceModifiedAt = a.SourceModifiedAt,
            })
            .ToListAsync();

        var ql = q?.ToLower() ?? "";
        var matchSet = string.IsNullOrWhiteSpace(ql)
            ? null
            : all.Where(a =>
                    a.DisplayName.ToLower().Contains(ql) ||
                    a.ExternalId.ToLower().Contains(ql) ||
                    (a.Category ?? "").ToLower().Contains(ql) ||
                    (a.Location ?? "").ToLower().Contains(ql))
                .Select(a => a.ExternalId)
                .ToHashSet();

        var childrenOf = all.GroupBy(a => a.ParentExternalId ?? "")
            .ToDictionary(g => g.Key, g => g.ToList());
        var allIds = all.Select(a => a.ExternalId).ToHashSet();
        var roots = all.Where(a => string.IsNullOrEmpty(a.ParentExternalId) || !allIds.Contains(a.ParentExternalId))
            .OrderBy(a => a.DisplayName)
            .ToList();

        var result = new List<object>();
        var keepNode = new HashSet<string>();
        if (matchSet is not null) MarkAncestors(roots, childrenOf, matchSet, keepNode);
        FlattenTree(roots, childrenOf, 0, matchSet, keepNode, result);

        var (sources, categories) = await GetAssetSummaries();
        return Ok(new { nodes = result, total = result.Count, sources, categories });
    }

    [HttpGet]
    [RequirePermission(Permissions.Jobs.Read)]
    public async Task<IActionResult> ListAssets(
        [FromQuery] string? source = null,
        [FromQuery] string? q = null,
        [FromQuery] bool? isActive = null,
        [FromQuery] string? category = null,
        [FromQuery] int limit = 50,
        [FromQuery] int offset = 0)
    {
        var query = FilterAssets(source, q, isActive, category);
        var total = await query.CountAsync();
        var (sources, categories) = await GetAssetSummaries();

        var items = await query
            .OrderBy(a => a.Source)
            .ThenBy(a => a.DisplayName)
            .Skip(offset)
            .Take(limit)
            .Select(a => new
            {
                id = a.Id,
                source = a.Source,
                external_id = a.ExternalId,
                parent_external_id = a.ParentExternalId,
                display_name = a.DisplayName,
                category = a.Category,
                location = a.Location,
                is_active = a.IsActive,
                last_synced_at = a.LastSyncedAt,
                source_modified_at = a.SourceModifiedAt,
            })
            .ToListAsync();

        return Ok(new { items, total, limit, offset, sources, categories });
    }

    [HttpGet("{id:int}")]
    [RequirePermission(Permissions.Jobs.Read)]
    public async Task<IActionResult> GetAsset(int id)
    {
        var asset = await db.ExternalAssets.FindAsync(id);
        if (asset is null) return NotFound(new { error = "Asset not found." });

        object? rawObj = null;
        if (!string.IsNullOrEmpty(asset.RawJson))
        {
            try { rawObj = JsonDocument.Parse(asset.RawJson).RootElement; }
            catch { rawObj = asset.RawJson; }
        }

        return Ok(new
        {
            id = asset.Id,
            source = asset.Source,
            external_id = asset.ExternalId,
            parent_external_id = asset.ParentExternalId,
            display_name = asset.DisplayName,
            category = asset.Category,
            location = asset.Location,
            is_active = asset.IsActive,
            last_synced_at = asset.LastSyncedAt,
            source_modified_at = asset.SourceModifiedAt,
            raw = rawObj,
        });
    }

    [HttpGet("requests")]
    [RequirePermission(Permissions.Jobs.Read)]
    public async Task<IActionResult> ListRequests(
        [FromQuery] string? q = null,
        [FromQuery] string? status = null,
        [FromQuery] int limit = 50,
        [FromQuery] int offset = 0)
    {
        limit = Math.Clamp(limit, 1, 200);
        offset = Math.Max(0, offset);

        var query = db.SubmissionRuleLogs
            .AsNoTracking()
            .Include(l => l.Submission).ThenInclude(s => s.Form)
            .Where(l => l.RuleType == "integration"
                && l.Channel == "mex"
                && (l.Action == null || l.Action == "create_request")
                && l.Submission.DeletedAt == null);

        if (!string.IsNullOrWhiteSpace(status))
        {
            var statusFilter = status.Trim().ToLowerInvariant();
            query = query.Where(l => l.Status.ToLower() == statusFilter);
        }

        if (!string.IsNullOrWhiteSpace(q))
        {
            var search = q.Trim().ToLower();
            query = query.Where(l =>
                l.RuleName.ToLower().Contains(search) ||
                l.Submission.Form.Name.ToLower().Contains(search) ||
                l.SubmissionId.ToString().Contains(search) ||
                (l.ResponseJson != null && l.ResponseJson.ToLower().Contains(search)));
        }

        var total = await query.CountAsync();
        var lastCreatedAt = await query.Select(l => (DateTime?)l.TriggeredAt).MaxAsync();

        var logs = await query
            .OrderByDescending(l => l.TriggeredAt)
            .Skip(offset)
            .Take(limit)
            .ToListAsync();

        var rows = logs.Select(l => new
        {
            id = l.Id,
            submission_id = l.SubmissionId,
            form_name = l.Submission.Form.Name,
            terminal_code = l.Submission.TerminalCode,
            rule_name = l.RuleName,
            action = l.Action,
            status = l.Status,
            status_code = l.StatusCode,
            triggered_at = l.TriggeredAt,
            completed_at = l.CompletedAt,
            request_number = ExtractRequestNumber(l.ResponseJson),
            error_message = l.ErrorMessage,
        }).ToList();

        return Ok(new { items = rows, total, limit, offset, last_created_at = lastCreatedAt });
    }

    [HttpPost("repair-hierarchy")]
    [RequirePermission(Permissions.Jobs.Manage)]
    public async Task<IActionResult> RepairHierarchy([FromQuery] string source = "mex")
    {
        var assets = await db.ExternalAssets
            .Where(a => a.Source == source && a.RawJson != null)
            .ToListAsync();

        int updated = 0, skipped = 0;
        foreach (var asset in assets)
        {
            try
            {
                using var doc = JsonDocument.Parse(asset.RawJson!);
                var root = doc.RootElement;
                string? parentId = null;
                foreach (var key in new[] { "parentAssetId", "ParentAssetId" })
                {
                    if (root.TryGetProperty(key, out var p) && p.ValueKind == JsonValueKind.Number)
                    {
                        var raw = p.GetRawText().Trim();
                        parentId = raw == "0" ? null : raw;
                        break;
                    }
                }

                if (asset.ParentExternalId != parentId)
                {
                    asset.ParentExternalId = parentId;
                    updated++;
                }
                else skipped++;
            }
            catch { skipped++; }
        }

        await db.SaveChangesAsync();
        return Ok(new { total = assets.Count, updated, skipped, source });
    }

    [HttpPost("sync-one")]
    [RequirePermission(Permissions.Jobs.Manage)]
    public async Task<IActionResult> SyncOne([FromBody] SyncOneRequest body)
    {
        if (string.IsNullOrWhiteSpace(body.ExternalId))
            return BadRequest(new { error = "externalId is required." });

        var settings = (await db.SiteSettings.ToListAsync()).ToDictionary(s => s.Key, s => s.Value);
        var baseUrl = settings.GetValueOrDefault("integration.mex.baseUrl");
        var apiKey = settings.GetValueOrDefault("integration.mex.apiKey");
        var enabled = settings.GetValueOrDefault("integration.mex.enabled");

        if (enabled != "true" || string.IsNullOrWhiteSpace(baseUrl) || string.IsNullOrWhiteSpace(apiKey))
            return BadRequest(new { error = "MEX integration is not configured or disabled." });

        using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };
        http.DefaultRequestHeaders.Add("XApiKey", apiKey);

        var fetched = new List<object>();
        var toFetch = new Queue<string>();
        var seen = new HashSet<string>();
        toFetch.Enqueue(body.ExternalId.Trim());
        var baseUri = baseUrl.TrimEnd('/');

        while (toFetch.Count > 0)
        {
            var externalId = toFetch.Dequeue();
            if (!seen.Add(externalId)) continue;

            try
            {
                var resp = await http.GetAsync($"{baseUri}/Asset/{externalId}");
                if (!resp.IsSuccessStatusCode)
                {
                    fetched.Add(new { external_id = externalId, status = "not_found", saved = false });
                    continue;
                }

                var responseBody = await resp.Content.ReadAsStringAsync();
                var el = JsonDocument.Parse(responseBody).RootElement;
                string? getId(params string[] keys)
                {
                    foreach (var k in keys)
                    {
                        if (!el.TryGetProperty(k, out var p)) continue;
                        if (p.ValueKind == JsonValueKind.String) return p.GetString();
                        if (p.ValueKind == JsonValueKind.Number) return p.GetRawText();
                    }
                    return null;
                }

                var assetExternalId = getId("assetId", "AssetId", "id", "Id") ?? externalId;
                var parentId = getId("parentAssetId", "ParentAssetId");
                if (parentId == "0") parentId = null;

                var displayName = getId("assetName", "AssetName", "assetNumber", "AssetNumber", "name", "Name");
                if (string.IsNullOrWhiteSpace(displayName))
                {
                    fetched.Add(new { external_id = assetExternalId, status = "skipped_no_asset_number", saved = false });
                    continue;
                }

                var now = DateTime.UtcNow;
                var existing = await db.ExternalAssets
                    .FirstOrDefaultAsync(a => a.Source == "mex" && a.ExternalId == assetExternalId);

                if (existing is null)
                {
                    db.ExternalAssets.Add(new ExternalAsset
                    {
                        Source = "mex",
                        ExternalId = assetExternalId,
                        ParentExternalId = parentId,
                        DisplayName = displayName,
                        Category = getId("assetCategory", "AssetCategory", "assetType", "AssetType"),
                        Location = getId("location", "Location", "locationName", "LocationName"),
                        IsActive = ReadBool(el, "isActive", "IsActive", "active", "Active") ?? true,
                        RawJson = responseBody,
                        SourceModifiedAt = ReadDate(el, "modifiedDateTime", "ModifiedDateTime", "modifiedAt", "updatedAt"),
                        LastSyncedAt = now,
                    });
                }
                else
                {
                    existing.ParentExternalId = parentId;
                    existing.DisplayName = displayName;
                    existing.Category = getId("assetCategory", "AssetCategory", "assetType", "AssetType");
                    existing.Location = getId("location", "Location", "locationName", "LocationName");
                    existing.IsActive = ReadBool(el, "isActive", "IsActive", "active", "Active") ?? existing.IsActive;
                    existing.RawJson = responseBody;
                    existing.SourceModifiedAt = ReadDate(el, "modifiedDateTime", "ModifiedDateTime", "modifiedAt", "updatedAt");
                    existing.LastSyncedAt = now;
                }

                await db.SaveChangesAsync();
                fetched.Add(new { external_id = assetExternalId, display_name = displayName, status = existing is null ? "inserted" : "updated", saved = true });

                if (!string.IsNullOrWhiteSpace(parentId) && !seen.Contains(parentId))
                {
                    var parentExists = await db.ExternalAssets.AnyAsync(a => a.Source == "mex" && a.ExternalId == parentId);
                    if (!parentExists) toFetch.Enqueue(parentId);
                }
            }
            catch (Exception ex)
            {
                fetched.Add(new { external_id = externalId, status = "error", error = ex.Message, saved = false });
            }
        }

        return Ok(new
        {
            success = true,
            requested_id = body.ExternalId,
            records = fetched,
            total_synced = fetched.Count(f => (bool)f.GetType().GetProperty("saved")!.GetValue(f)!),
        });
    }

    [HttpPost("best-effort-sync")]
    [RequirePermission(Permissions.Jobs.Manage)]
    public async Task<IActionResult> BestEffortSync()
    {
        var currentUser = HttpContext.GetCurrentUser();
        var quartzKey = new JobKey(HPA.SurveyFlow.Infrastructure.Jobs.Implementations.MexGapFillJob.JobKey, "surveyflow");
        var scheduler = await schedulerFactory.GetScheduler();

        if (!await scheduler.CheckExists(quartzKey))
        {
            var def = await db.ScheduledJobDefinitions.FirstOrDefaultAsync(
                j => j.JobKey == HPA.SurveyFlow.Infrastructure.Jobs.Implementations.MexGapFillJob.JobKey);
            if (def is null)
                return BadRequest(new { error = "Gap fill job definition not found. Run startup seeding first." });

            var jobType = ResolveJobType(def.JobType);
            if (jobType is null)
                return BadRequest(new { error = "Could not resolve gap fill job type." });

            await scheduler.AddJob(JobBuilder.Create(jobType).WithIdentity(quartzKey).StoreDurably().Build(), replace: true);
        }

        await scheduler.TriggerJob(quartzKey,
            new JobDataMap { { "trigger_type", "manual" }, { "triggered_by", currentUser?.Email ?? "unknown" } });

        return Ok(new { success = true, message = "Gap fill job triggered. Check Jobs dashboard for progress." });
    }

    private IQueryable<ExternalAsset> FilterAssets(string? source, string? q, bool? isActive, string? category)
    {
        var query = db.ExternalAssets.AsQueryable();
        if (!string.IsNullOrWhiteSpace(source)) query = query.Where(a => a.Source == source);
        if (isActive.HasValue) query = query.Where(a => a.IsActive == isActive.Value);
        if (!string.IsNullOrWhiteSpace(category)) query = query.Where(a => a.Category == category);
        if (!string.IsNullOrWhiteSpace(q))
        {
            var ql = q.ToLower();
            query = query.Where(a =>
                a.DisplayName.ToLower().Contains(ql) ||
                a.ExternalId.ToLower().Contains(ql) ||
                (a.Category != null && a.Category.ToLower().Contains(ql)) ||
                (a.Location != null && a.Location.ToLower().Contains(ql)));
        }
        return query;
    }

    private async Task<(object sources, List<string> categories)> GetAssetSummaries()
    {
        var sources = await db.ExternalAssets
            .GroupBy(a => a.Source)
            .Select(g => new { source = g.Key, count = g.Count(), last_synced_at = g.Max(a => a.LastSyncedAt) })
            .ToListAsync();

        var categories = await db.ExternalAssets
            .Where(a => a.Category != null)
            .Select(a => a.Category!)
            .Distinct()
            .OrderBy(c => c)
            .ToListAsync();

        return (sources, categories);
    }

    private static bool MarkAncestors(IEnumerable<AssetNode> nodes, Dictionary<string, List<AssetNode>> childrenOf, HashSet<string> matchSet, HashSet<string> keepSet)
    {
        var anyMatch = false;
        foreach (var node in nodes)
        {
            var children = childrenOf.GetValueOrDefault(node.ExternalId, []);
            var childMatch = MarkAncestors(children, childrenOf, matchSet, keepSet);
            var selfMatch = matchSet.Contains(node.ExternalId);
            if (!selfMatch && !childMatch) continue;
            keepSet.Add(node.ExternalId);
            anyMatch = true;
        }
        return anyMatch;
    }

    private static void FlattenTree(IEnumerable<AssetNode> nodes, Dictionary<string, List<AssetNode>> childrenOf, int depth, HashSet<string>? matchSet, HashSet<string> keepSet, List<object> result)
    {
        foreach (var node in nodes.OrderBy(n => n.DisplayName))
        {
            if (matchSet is not null && !keepSet.Contains(node.ExternalId)) continue;

            var children = childrenOf.GetValueOrDefault(node.ExternalId, []);
            result.Add(new
            {
                id = node.Id,
                external_id = node.ExternalId,
                parent_external_id = node.ParentExternalId,
                display_name = node.DisplayName,
                category = node.Category,
                location = node.Location,
                is_active = node.IsActive,
                source = node.Source,
                last_synced_at = node.LastSyncedAt,
                source_modified_at = node.SourceModifiedAt,
                depth,
                has_children = children.Count > 0,
                child_count = children.Count,
                is_match = matchSet is null || matchSet.Contains(node.ExternalId),
            });

            FlattenTree(children, childrenOf, depth + 1, matchSet, keepSet, result);
        }
    }

    private static bool? ReadBool(JsonElement el, params string[] keys)
    {
        foreach (var key in keys)
            if (el.TryGetProperty(key, out var p) && p.ValueKind is JsonValueKind.True or JsonValueKind.False)
                return p.GetBoolean();
        return null;
    }

    private static DateTime? ReadDate(JsonElement el, params string[] keys)
    {
        foreach (var key in keys)
        {
            if (el.TryGetProperty(key, out var p) && p.ValueKind == JsonValueKind.String && DateTime.TryParse(p.GetString(), out var dt))
                return DateTime.SpecifyKind(dt, DateTimeKind.Utc);
        }
        return null;
    }

    private static string? ExtractRequestNumber(string? responseJson)
    {
        if (string.IsNullOrWhiteSpace(responseJson)) return null;
        try
        {
            using var doc = JsonDocument.Parse(responseJson);
            if (TryExtractRequestNumber(doc.RootElement, out var requestNumber))
                return requestNumber;

            if (doc.RootElement.TryGetProperty("body", out var bodyEl)
                || (doc.RootElement.TryGetProperty("result", out var result) && result.TryGetProperty("body", out bodyEl)))
            {
                var body = bodyEl.ValueKind == JsonValueKind.String ? bodyEl.GetString() : bodyEl.GetRawText();
                if (!string.IsNullOrWhiteSpace(body))
                {
                    using var bodyDoc = JsonDocument.Parse(body);
                    if (TryExtractRequestNumber(bodyDoc.RootElement, out requestNumber))
                        return requestNumber;
                }
            }
        }
        catch { }
        return null;
    }

    private static bool TryExtractRequestNumber(JsonElement root, out string? requestNumber)
    {
        requestNumber = null;
        if (!root.TryGetProperty("requestNumber", out var value)
            && !root.TryGetProperty("RequestNumber", out value))
            return false;

        requestNumber = value.ValueKind == JsonValueKind.String ? value.GetString() : value.GetRawText();
        return !string.IsNullOrWhiteSpace(requestNumber);
    }

    private static Type? ResolveJobType(string typeName)
    {
        foreach (var assembly in AppDomain.CurrentDomain.GetAssemblies())
        {
            var type = assembly.GetType(typeName);
            if (type is not null) return type;
        }
        return null;
    }
}

internal sealed class AssetNode
{
    public int Id { get; init; }
    public string ExternalId { get; init; } = "";
    public string? ParentExternalId { get; init; }
    public string DisplayName { get; init; } = "";
    public string? Category { get; init; }
    public string? Location { get; init; }
    public bool IsActive { get; init; }
    public string Source { get; init; } = "";
    public DateTime LastSyncedAt { get; init; }
    public DateTime? SourceModifiedAt { get; init; }
}

public class SyncOneRequest
{
    public string? ExternalId { get; set; }
}
