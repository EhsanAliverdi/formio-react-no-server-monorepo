using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Quartz;
using HPA.SurveyFlow.Api.Extensions;
using HPA.SurveyFlow.Domain.Enums;
using HPA.SurveyFlow.Infrastructure.Data;
using HPA.SurveyFlow.Infrastructure.Jobs.Scheduling;

namespace HPA.SurveyFlow.Api.Controllers;

[ApiController]
[Route("api/admin/jobs")]
public class JobsController(AppDbContext db, ISchedulerFactory schedulerFactory, JobScheduler jobScheduler) : ControllerBase
{
    // GET /api/admin/jobs — list all job definitions with latest run info
    [HttpGet]
    public async Task<IActionResult> List()
    {
        try { HttpContext.RequireRole(UserRole.Admin); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        var jobs      = await db.ScheduledJobDefinitions.OrderBy(j => j.DisplayName).ToListAsync();
        var scheduler = await schedulerFactory.GetScheduler();
        var result    = new List<object>();

        foreach (var job in jobs)
        {
            var lastRun = await db.JobRuns
                .Where(r => r.JobKey == job.JobKey)
                .OrderByDescending(r => r.StartedAt)
                .Select(r => new
                {
                    status         = r.Status,
                    started_at     = r.StartedAt,
                    completed_at   = r.CompletedAt,
                    result_summary = r.ResultSummary,
                    error_message  = r.ErrorMessage,
                    trigger_type   = r.TriggerType,
                })
                .FirstOrDefaultAsync();

            // Resolve next scheduled fire time from Quartz
            DateTimeOffset? nextRun = null;
            try
            {
                var quartzKey = new JobKey(job.JobKey, "surveyflow");
                var triggers  = await scheduler.GetTriggersOfJob(quartzKey);
                nextRun = triggers.Select(t => t.GetNextFireTimeUtc()).Where(t => t.HasValue)
                                  .OrderBy(t => t!.Value).FirstOrDefault();
            }
            catch { /* job not in scheduler (disabled) */ }

            result.Add(new
            {
                id                 = job.Id,
                job_key            = job.JobKey,
                display_name       = job.DisplayName,
                description        = job.Description,
                cron_expression    = job.CronExpression,
                is_enabled           = job.IsEnabled,
                sync_mode            = job.SyncMode,
                only_update_changed  = job.OnlyUpdateChanged,
                parameter_schema     = job.ParameterSchema,
                default_parameters   = job.DefaultParameters,
                created_at         = job.CreatedAt,
                updated_at         = job.UpdatedAt,
                last_run           = lastRun,
                next_run_at        = nextRun?.UtcDateTime,
            });
        }

        return Ok(result);
    }

    // GET /api/admin/jobs/{key}/runs — paginated run history for a job
    [HttpGet("{key}/runs")]
    public async Task<IActionResult> GetRuns(string key, [FromQuery] int limit = 50, [FromQuery] int offset = 0)
    {
        try { HttpContext.RequireRole(UserRole.Admin); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        var total = await db.JobRuns.CountAsync(r => r.JobKey == key);
        var items = await db.JobRuns
            .Where(r => r.JobKey == key)
            .OrderByDescending(r => r.StartedAt)
            .Skip(offset).Take(limit)
            .Select(r => MapRun(r))
            .ToListAsync();

        return Ok(new { items, total, limit, offset });
    }

    // GET /api/admin/jobs/runs — all runs across all jobs
    [HttpGet("runs")]
    public async Task<IActionResult> GetAllRuns([FromQuery] int limit = 50, [FromQuery] int offset = 0)
    {
        try { HttpContext.RequireRole(UserRole.Admin); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        var total = await db.JobRuns.CountAsync();
        var items = await db.JobRuns
            .OrderByDescending(r => r.StartedAt)
            .Skip(offset).Take(limit)
            .Select(r => MapRun(r))
            .ToListAsync();

        return Ok(new { items, total, limit, offset });
    }

    // POST /api/admin/jobs/{key}/trigger — manually run a job now, with optional parameters
    [HttpPost("{key}/trigger")]
    public async Task<IActionResult> Trigger(string key, [FromBody] TriggerJobRequest? body = null)
    {
        try { HttpContext.RequireRole(UserRole.Admin); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        var def = await db.ScheduledJobDefinitions.FirstOrDefaultAsync(j => j.JobKey == key);
        if (def is null) return NotFound(new { error = "Job not found." });

        var currentUser = HttpContext.GetCurrentUser();
        var quartzKey   = new JobKey(key, "surveyflow");
        var scheduler   = await schedulerFactory.GetScheduler();

        // Ensure the job exists in Quartz (may be disabled/not scheduled)
        if (!await scheduler.CheckExists(quartzKey))
        {
            var jobType = ResolveJobType(def.JobType);
            if (jobType is null) return BadRequest(new { error = "Could not resolve job type." });
            await scheduler.AddJob(
                JobBuilder.Create(jobType).WithIdentity(quartzKey).StoreDurably().Build(),
                replace: true);
        }

        // Build JobDataMap — always includes trigger metadata + optional parameters JSON
        var dataMap = new JobDataMap
        {
            { "trigger_type", "manual" },
            { "triggered_by", currentUser?.Email ?? "unknown" },
        };

        if (body is not null)
        {
            var dateFrom = body.FullHistorical == true
                ? new DateTime(2000, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                : body.DateFrom;

            var dateTo = body.DateTo ?? DateTime.UtcNow;

            if (dateFrom.HasValue)
            {
                var p = new HPA.SurveyFlow.Domain.Jobs.DateRangeJobParameters(
                    dateFrom.Value, dateTo,
                    PurgeBeforeSync: body.PurgeBeforeSync == true);
                dataMap.Add("parameters",
                    System.Text.Json.JsonSerializer.Serialize(p,
                        new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web)));
            }
        }

        await scheduler.TriggerJob(quartzKey, dataMap);

        return Ok(new { success = true, message = $"Job '{def.DisplayName}' triggered." });
    }

    // POST /api/admin/jobs/{key}/interrupt — cancel a currently-running job execution
    [HttpPost("{key}/interrupt")]
    public async Task<IActionResult> Interrupt(string key)
    {
        try { HttpContext.RequireRole(UserRole.Admin); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        var scheduler = await schedulerFactory.GetScheduler();
        var quartzKey = new JobKey(key, "surveyflow");

        // Ask Quartz to interrupt the running job (sets cancellation token)
        var interrupted = await scheduler.Interrupt(quartzKey);

        // Also mark any stuck "running" JobRun rows as failed in the DB
        var stuckRuns = await db.JobRuns
            .Where(r => r.JobKey == key && r.Status == "running")
            .ToListAsync();

        foreach (var run in stuckRuns)
        {
            run.Status       = "failed";
            run.CompletedAt  = DateTime.UtcNow;
            run.ErrorMessage = "Manually interrupted by admin.";
        }
        await db.SaveChangesAsync();

        return Ok(new
        {
            success     = true,
            interrupted,
            runs_marked = stuckRuns.Count,
            message     = interrupted
                ? $"Job '{key}' interrupted."
                : $"Job '{key}' was not running in Quartz, but {stuckRuns.Count} stuck run(s) cleared.",
        });
    }

    // PUT /api/admin/jobs/{key} — update cron + enabled flag
    [HttpPut("{key}")]
    public async Task<IActionResult> Update(string key, [FromBody] UpdateJobRequest body)
    {
        try { HttpContext.RequireRole(UserRole.Admin); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        var def = await db.ScheduledJobDefinitions.FirstOrDefaultAsync(j => j.JobKey == key);
        if (def is null) return NotFound(new { error = "Job not found." });

        if (body.CronExpression != null)
        {
            if (!IsValidCron(body.CronExpression))
                return BadRequest(new { error = "Invalid cron expression." });
            def.CronExpression = body.CronExpression;
        }

        if (body.IsEnabled.HasValue)        def.IsEnabled           = body.IsEnabled.Value;
        if (body.Description != null)       def.Description         = body.Description;
        if (body.SyncMode != null)          def.SyncMode            = body.SyncMode;
        if (body.OnlyUpdateChanged.HasValue) def.OnlyUpdateChanged  = body.OnlyUpdateChanged.Value;

        def.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        // Re-apply schedules so the change takes effect immediately
        await jobScheduler.ApplyAsync();

        return Ok(new { success = true, job = new { job_key = def.JobKey, is_enabled = def.IsEnabled, cron_expression = def.CronExpression } });
    }

    // ── Synced Data ────────────────────────────────────────────────────────

    // GET /api/admin/assets/tree — full hierarchy, server-side sorted and flattened
    // Returns a depth-annotated flat list ready for the UI to render as a tree.
    // Search (q) marks matched nodes and their ancestors as visible.
    [HttpGet("/api/admin/assets/tree")]
    public async Task<IActionResult> GetAssetTree(
        [FromQuery] string? source = null,
        [FromQuery] string? q = null,
        [FromQuery] bool? isActive = null,
        [FromQuery] string? category = null)
    {
        try { HttpContext.RequireRole(UserRole.Admin, UserRole.Editor); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        // 1. Load all assets (tree needs the complete set to link parents)
        var query = db.ExternalAssets.AsQueryable();
        if (!string.IsNullOrWhiteSpace(source))   query = query.Where(a => a.Source == source);
        if (isActive.HasValue)                     query = query.Where(a => a.IsActive == isActive.Value);
        if (!string.IsNullOrWhiteSpace(category))  query = query.Where(a => a.Category == category);

        var all = await query
            .OrderBy(a => a.DisplayName)
            .Select(a => new AssetNode
            {
                Id               = a.Id,
                ExternalId       = a.ExternalId,
                ParentExternalId = a.ParentExternalId,
                DisplayName      = a.DisplayName,
                Category         = a.Category,
                Location         = a.Location,
                IsActive         = a.IsActive,
                Source           = a.Source,
                LastSyncedAt     = a.LastSyncedAt,
                SourceModifiedAt = a.SourceModifiedAt,
            })
            .ToListAsync();

        // 2. Apply text search — mark matched nodes; matched ancestors will be kept visible
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

        // 3. Build parent→children map
        var childrenOf = all.GroupBy(a => a.ParentExternalId ?? "")
                            .ToDictionary(g => g.Key, g => g.ToList());

        // 4. Identify root nodes (no parent, or parent not in dataset)
        var allIds = all.Select(a => a.ExternalId).ToHashSet();
        var roots  = all.Where(a => string.IsNullOrEmpty(a.ParentExternalId)
                                 || !allIds.Contains(a.ParentExternalId))
                        .OrderBy(a => a.DisplayName)
                        .ToList();

        // 5. Flatten tree depth-first, compute depth + has_children
        var result   = new List<object>();
        var keepNode = new HashSet<string>(); // nodes that must be kept (matched or ancestor of match)

        if (matchSet is not null)
            MarkAncestors(roots, childrenOf, matchSet, keepNode);

        FlattenTree(roots, childrenOf, 0, matchSet, keepNode, result);

        // 6. Source summaries
        var sources = await db.ExternalAssets
            .GroupBy(a => a.Source)
            .Select(g => new { source = g.Key, count = g.Count(), last_synced_at = g.Max(a => a.LastSyncedAt) })
            .ToListAsync();

        var categories = await db.ExternalAssets
            .Where(a => a.Category != null)
            .Select(a => a.Category!)
            .Distinct().OrderBy(c => c)
            .ToListAsync();

        return Ok(new { nodes = result, total = result.Count, sources, categories });
    }

    private static bool MarkAncestors(
        IEnumerable<AssetNode> nodes,
        Dictionary<string, List<AssetNode>> childrenOf,
        HashSet<string> matchSet,
        HashSet<string> keepSet)
    {
        bool anyMatch = false;
        foreach (var node in nodes)
        {
            var children = childrenOf.GetValueOrDefault(node.ExternalId, []);
            bool childMatch = MarkAncestors(children, childrenOf, matchSet, keepSet);
            bool selfMatch  = matchSet.Contains(node.ExternalId);
            if (selfMatch || childMatch)
            {
                keepSet.Add(node.ExternalId);
                anyMatch = true;
            }
        }
        return anyMatch;
    }

    private static void FlattenTree(
        IEnumerable<AssetNode> nodes,
        Dictionary<string, List<AssetNode>> childrenOf,
        int depth,
        HashSet<string>? matchSet,
        HashSet<string> keepSet,
        List<object> result)
    {
        foreach (var node in nodes.OrderBy(n => n.DisplayName))
        {
            if (matchSet is not null && !keepSet.Contains(node.ExternalId)) continue;

            var children = childrenOf.GetValueOrDefault(node.ExternalId, []);
            var isMatch  = matchSet is null || matchSet.Contains(node.ExternalId);

            result.Add(new
            {
                id                 = node.Id,
                external_id        = node.ExternalId,
                parent_external_id = node.ParentExternalId,
                display_name       = node.DisplayName,
                category           = node.Category,
                location           = node.Location,
                is_active          = node.IsActive,
                source             = node.Source,
                last_synced_at     = node.LastSyncedAt,
                source_modified_at = node.SourceModifiedAt,
                depth              = depth,
                has_children       = children.Count > 0,
                child_count        = children.Count,
                is_match           = isMatch,
            });

            FlattenTree(children, childrenOf, depth + 1, matchSet, keepSet, result);
        }
    }

    // GET /api/admin/assets?source=mex&q=pump&isActive=true&limit=50&offset=0
    [HttpGet("/api/admin/assets")]
    public async Task<IActionResult> ListAssets(
        [FromQuery] string? source = null,
        [FromQuery] string? q = null,
        [FromQuery] bool? isActive = null,
        [FromQuery] string? category = null,
        [FromQuery] int limit = 50,
        [FromQuery] int offset = 0)
    {
        try { HttpContext.RequireRole(UserRole.Admin, UserRole.Editor); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

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

        var total = await query.CountAsync();

        // Summary for the header: distinct sources + last sync time
        var sources = await db.ExternalAssets
            .GroupBy(a => a.Source)
            .Select(g => new { source = g.Key, count = g.Count(), last_synced_at = g.Max(a => a.LastSyncedAt) })
            .ToListAsync();

        // Distinct categories for filter dropdown
        var categories = await db.ExternalAssets
            .Where(a => a.Category != null)
            .Select(a => a.Category!)
            .Distinct()
            .OrderBy(c => c)
            .ToListAsync();

        var items = await query
            .OrderBy(a => a.Source)
            .ThenBy(a => a.DisplayName)
            .Skip(offset).Take(limit)
            .Select(a => new
            {
                id                 = a.Id,
                source             = a.Source,
                external_id        = a.ExternalId,
                parent_external_id = a.ParentExternalId,
                display_name       = a.DisplayName,
                category           = a.Category,
                location           = a.Location,
                is_active          = a.IsActive,
                last_synced_at     = a.LastSyncedAt,
                source_modified_at = a.SourceModifiedAt,
            })
            .ToListAsync();

        return Ok(new { items, total, limit, offset, sources, categories });
    }

    // POST /api/admin/assets/repair-hierarchy
    // Re-populate parent_external_id from raw_json for ALL existing records.
    // Run once after the NullableInt fix to backfill records synced before the fix.
    [HttpPost("/api/admin/assets/repair-hierarchy")]
    public async Task<IActionResult> RepairHierarchy([FromQuery] string source = "mex")
    {
        try { HttpContext.RequireRole(UserRole.Admin); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        var assets = await db.ExternalAssets
            .Where(a => a.Source == source && a.RawJson != null)
            .ToListAsync();

        int updated = 0, skipped = 0;

        foreach (var asset in assets)
        {
            try
            {
                using var doc = System.Text.Json.JsonDocument.Parse(asset.RawJson!);
                var root = doc.RootElement;

                string? parentId = null;
                foreach (var key in new[] { "parentAssetId", "ParentAssetId" })
                {
                    if (root.TryGetProperty(key, out var p) && p.ValueKind == System.Text.Json.JsonValueKind.Number)
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

    // GET /api/admin/assets/{id} — full detail including raw JSON snapshot
    [HttpGet("/api/admin/assets/{id:int}")]
    public async Task<IActionResult> GetAsset(int id)
    {
        try { HttpContext.RequireRole(UserRole.Admin, UserRole.Editor); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        var asset = await db.ExternalAssets.FindAsync(id);
        if (asset is null) return NotFound(new { error = "Asset not found." });

        object? rawObj = null;
        if (!string.IsNullOrEmpty(asset.RawJson))
        {
            try { rawObj = System.Text.Json.JsonDocument.Parse(asset.RawJson).RootElement; } catch { rawObj = asset.RawJson; }
        }

        return Ok(new
        {
            id                 = asset.Id,
            source             = asset.Source,
            external_id        = asset.ExternalId,
            parent_external_id = asset.ParentExternalId,
            display_name       = asset.DisplayName,
            category           = asset.Category,
            location           = asset.Location,
            is_active          = asset.IsActive,
            last_synced_at     = asset.LastSyncedAt,
            source_modified_at = asset.SourceModifiedAt,
            raw                = rawObj,
        });
    }

    // POST /api/admin/assets/sync-one — fetch a single asset + all its ancestors from MEX
    [HttpPost("/api/admin/assets/sync-one")]
    public async Task<IActionResult> SyncOne([FromBody] SyncOneRequest body)
    {
        try { HttpContext.RequireRole(UserRole.Admin, UserRole.Editor); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        if (string.IsNullOrWhiteSpace(body.ExternalId))
            return BadRequest(new { error = "externalId is required." });

        var settings = (await db.SiteSettings.ToListAsync())
            .ToDictionary(s => s.Key, s => s.Value);

        var baseUrl = settings.GetValueOrDefault("integration.mex.baseUrl");
        var apiKey  = settings.GetValueOrDefault("integration.mex.apiKey");
        var enabled = settings.GetValueOrDefault("integration.mex.enabled");

        if (enabled != "true" || string.IsNullOrWhiteSpace(baseUrl) || string.IsNullOrWhiteSpace(apiKey))
            return BadRequest(new { error = "MEX integration is not configured or disabled." });

        using var http = new System.Net.Http.HttpClient { Timeout = TimeSpan.FromSeconds(30) };
        http.DefaultRequestHeaders.Add("XApiKey", apiKey);
        var base_ = baseUrl.TrimEnd('/');

        var fetched    = new List<object>();
        var toFetch    = new Queue<string>();
        var seen       = new HashSet<string>();
        toFetch.Enqueue(body.ExternalId.Trim());

        while (toFetch.Count > 0)
        {
            var externalId = toFetch.Dequeue();
            if (!seen.Add(externalId)) continue;

            try
            {
                var resp = await http.GetAsync($"{base_}/Asset/{externalId}");
                if (!resp.IsSuccessStatusCode)
                {
                    fetched.Add(new { external_id = externalId, status = "not_found", saved = false });
                    continue;
                }

                var body2 = await resp.Content.ReadAsStringAsync();
                var el    = System.Text.Json.JsonDocument.Parse(body2).RootElement;

                // Extract fields
                string? getId(params string[] keys) {
                    foreach (var k in keys)
                        if (el.TryGetProperty(k, out var p)) {
                            if (p.ValueKind == System.Text.Json.JsonValueKind.String) return p.GetString();
                            if (p.ValueKind == System.Text.Json.JsonValueKind.Number) return p.GetRawText();
                        }
                    return null;
                }

                var assetExternalId = getId("assetId", "AssetId", "id", "Id") ?? externalId;
                var parentId        = getId("parentAssetId", "ParentAssetId");
                // 0 = no parent in MEX
                if (parentId == "0") parentId = null;

                var displayName = getId("assetName", "AssetName", "assetNumber", "AssetNumber", "name", "Name");
                if (string.IsNullOrWhiteSpace(displayName))
                {
                    fetched.Add(new { external_id = assetExternalId, status = "skipped_no_asset_number", saved = false });
                    continue;
                }
                var category = getId("assetCategory", "AssetCategory", "assetType", "AssetType");
                var location = getId("location", "Location", "locationName", "LocationName");
                var rawJson  = body2;

                bool? isActive = null;
                foreach (var k in new[] { "isActive", "IsActive", "active", "Active" })
                    if (el.TryGetProperty(k, out var p) && p.ValueKind is System.Text.Json.JsonValueKind.True or System.Text.Json.JsonValueKind.False)
                    { isActive = p.GetBoolean(); break; }

                DateTime? sourceModifiedAt = null;
                foreach (var k in new[] { "modifiedDateTime", "ModifiedDateTime", "modifiedAt", "updatedAt" })
                    if (el.TryGetProperty(k, out var p) && p.ValueKind == System.Text.Json.JsonValueKind.String)
                        if (DateTime.TryParse(p.GetString(), out var dt))
                        { sourceModifiedAt = DateTime.SpecifyKind(dt, DateTimeKind.Utc); break; }

                var now      = DateTime.UtcNow;
                var existing = await db.ExternalAssets
                    .FirstOrDefaultAsync(a => a.Source == "mex" && a.ExternalId == assetExternalId);

                string action;
                if (existing is null)
                {
                    db.ExternalAssets.Add(new HPA.SurveyFlow.Domain.Entities.ExternalAsset
                    {
                        Source           = "mex",
                        ExternalId       = assetExternalId,
                        ParentExternalId = parentId,
                        DisplayName      = displayName,
                        Category         = category,
                        Location         = location,
                        IsActive         = isActive ?? true,
                        RawJson          = rawJson,
                        SourceModifiedAt = sourceModifiedAt,
                        LastSyncedAt     = now,
                    });
                    action = "inserted";
                }
                else
                {
                    existing.ParentExternalId = parentId;
                    existing.DisplayName      = displayName;
                    existing.Category         = category;
                    existing.Location         = location;
                    existing.IsActive         = isActive ?? existing.IsActive;
                    existing.RawJson          = rawJson;
                    existing.SourceModifiedAt = sourceModifiedAt;
                    existing.LastSyncedAt     = now;
                    action = "updated";
                }

                await db.SaveChangesAsync();
                fetched.Add(new { external_id = assetExternalId, display_name = displayName, status = action, saved = true });

                // Queue parent for fetching if not already seen or in DB
                if (!string.IsNullOrWhiteSpace(parentId) && !seen.Contains(parentId))
                {
                    var parentExists = await db.ExternalAssets
                        .AnyAsync(a => a.Source == "mex" && a.ExternalId == parentId);
                    if (!parentExists)
                        toFetch.Enqueue(parentId);
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
            total_synced = fetched.Count(f => (bool)((dynamic)f).saved),
        });
    }

    // POST /api/admin/assets/best-effort-sync — triggers MexGapFillJob as a background job
    [HttpPost("/api/admin/assets/best-effort-sync")]
    public async Task<IActionResult> BestEffortSync()
    {
        try { HttpContext.RequireRole(UserRole.Admin, UserRole.Editor); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        var currentUser = HttpContext.GetCurrentUser();
        var quartzKey   = new JobKey(HPA.SurveyFlow.Infrastructure.Jobs.Implementations.MexGapFillJob.JobKey, "surveyflow");
        var scheduler   = await schedulerFactory.GetScheduler();

        // Ensure the job detail exists in Quartz (may be disabled)
        if (!await scheduler.CheckExists(quartzKey))
        {
            var def = await db.ScheduledJobDefinitions.FirstOrDefaultAsync(
                j => j.JobKey == HPA.SurveyFlow.Infrastructure.Jobs.Implementations.MexGapFillJob.JobKey);
            if (def is null)
                return BadRequest(new { error = "Gap fill job definition not found. Run startup seeding first." });

            var jobType = ResolveJobType(def.JobType);
            if (jobType is null)
                return BadRequest(new { error = "Could not resolve gap fill job type." });

            await scheduler.AddJob(
                JobBuilder.Create(jobType).WithIdentity(quartzKey).StoreDurably().Build(),
                replace: true);
        }

        await scheduler.TriggerJob(quartzKey,
            new JobDataMap { { "trigger_type", "manual" }, { "triggered_by", currentUser?.Email ?? "unknown" } });

        return Ok(new { success = true, message = "Gap fill job triggered. Check Jobs dashboard for progress." });
    }

    private static object MapRun(HPA.SurveyFlow.Domain.Entities.JobRun r) => new
    {
        id = r.Id,
        job_key = r.JobKey,
        display_name = r.DisplayName,
        trigger_type = r.TriggerType,
        triggered_by_email = r.TriggeredByEmail,
        started_at = r.StartedAt,
        completed_at = r.CompletedAt,
        status = r.Status,
        error_message = r.ErrorMessage,
        result_summary = r.ResultSummary,
    };

    private static bool IsValidCron(string expr)
    {
        try { CronExpression.ValidateExpression(expr); return true; }
        catch { return false; }
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

/// <summary>Internal projection used when building the asset tree.</summary>
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

public class UpdateJobRequest
{
    public string? CronExpression { get; set; }
    public bool? IsEnabled { get; set; }
    public string? Description { get; set; }
    /// <summary>"delta" or "full"</summary>
    public string? SyncMode { get; set; }
    public bool? OnlyUpdateChanged { get; set; }
}

public class TriggerJobRequest
{
    /// <summary>Start of the date range. Null = auto (delta since last run).</summary>
    public DateTime? DateFrom { get; set; }
    /// <summary>End of the date range. Null = now.</summary>
    public DateTime? DateTo { get; set; }
    /// <summary>Shortcut: sets DateFrom to 2000-01-01 for a full historical backfill.</summary>
    public bool? FullHistorical { get; set; }
    /// <summary>Delete all existing records before syncing. Only allowed in non-production environments.</summary>
    public bool? PurgeBeforeSync { get; set; }
}
