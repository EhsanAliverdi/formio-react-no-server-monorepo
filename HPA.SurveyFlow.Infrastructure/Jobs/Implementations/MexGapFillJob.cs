using System.Text.Json;
using HPA.SurveyFlow.Domain.Entities;
using HPA.SurveyFlow.Domain.Events;
using HPA.SurveyFlow.Infrastructure.Data;
using HPA.SurveyFlow.Infrastructure.Jobs.Abstractions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Quartz;

namespace HPA.SurveyFlow.Infrastructure.Jobs.Implementations;

/// <summary>
/// Best-effort gap fill for MEX assets.
///
/// Finds the min/max numeric external_id already in our DB, identifies every integer
/// in that range that is missing, then fetches each one individually via /Asset/{id}.
/// Runs entirely in the background — 404s are skipped cleanly, errors are logged.
/// No artificial batch limit: processes ALL gaps in one run.
/// </summary>
[DisallowConcurrentExecution]
public sealed class MexGapFillJob(
    AppDbContext db,
    IEventBus eventBus,
    ILogger<MexGapFillJob> logger) : IScheduledJob
{
    public static string JobKey => "mex-gap-fill";

    public async Task Execute(IJobExecutionContext context)
    {
        var ct          = context.CancellationToken;
        var map         = context.MergedJobDataMap;
        var triggerType = (map.ContainsKey("trigger_type") ? map.GetString("trigger_type") : null) ?? "scheduled";
        var triggeredBy = map.ContainsKey("triggered_by") ? map.GetString("triggered_by") : null;

        await eventBus.PublishAsync(new JobStartedEvent(JobKey, "MEX Gap Fill", triggerType, triggeredBy));

        try
        {
            // ── Load MEX config ────────────────────────────────────────────
            var settings = (await db.SiteSettings.ToListAsync(ct))
                .ToDictionary(s => s.Key, s => s.Value);

            var baseUrl = settings.GetValueOrDefault("integration.mex.baseUrl");
            var apiKey  = settings.GetValueOrDefault("integration.mex.apiKey");
            var enabled = settings.GetValueOrDefault("integration.mex.enabled");

            if (enabled != "true" || string.IsNullOrWhiteSpace(baseUrl) || string.IsNullOrWhiteSpace(apiKey))
            {
                await eventBus.PublishAsync(new JobCompletedEvent(JobKey,
                    """{"skipped":true,"reason":"MEX integration not configured or disabled"}"""));
                return;
            }

            // ── Find gaps ──────────────────────────────────────────────────
            var allIds = await db.ExternalAssets
                .Where(a => a.Source == "mex")
                .Select(a => a.ExternalId)
                .ToListAsync(ct);

            var numericIds = allIds
                .Select(id => int.TryParse(id, out var n) ? n : (int?)null)
                .Where(n => n.HasValue)
                .Select(n => n!.Value)
                .ToHashSet();

            if (numericIds.Count == 0)
            {
                await eventBus.PublishAsync(new JobCompletedEvent(JobKey,
                    """{"skipped":true,"reason":"No existing records to determine ID range"}"""));
                return;
            }

            var minId    = numericIds.Min();
            var maxId    = numericIds.Max();
            var gapIds   = Enumerable.Range(minId, maxId - minId + 1)
                              .Where(id => !numericIds.Contains(id))
                              .ToList();

            logger.LogInformation("MexGapFillJob: range {Min}–{Max}, {Total} IDs, {Gaps} gaps to check",
                minId, maxId, maxId - minId + 1, gapIds.Count);

            if (gapIds.Count == 0)
            {
                await eventBus.PublishAsync(new JobCompletedEvent(JobKey,
                    JsonSerializer.Serialize(new { min_id = minId, max_id = maxId, gaps = 0, fetched = 0, not_found = 0 })));
                return;
            }

            // ── Fetch each gap ─────────────────────────────────────────────
            using var http = new System.Net.Http.HttpClient { Timeout = TimeSpan.FromSeconds(30) };
            http.DefaultRequestHeaders.Add("XApiKey", apiKey);
            var base_ = baseUrl.TrimEnd('/');

            int fetched = 0, notFound = 0, errors = 0;
            var now = DateTime.UtcNow;

            foreach (var gapId in gapIds)
            {
                ct.ThrowIfCancellationRequested();

                try
                {
                    var resp = await http.GetAsync($"{base_}/Asset/{gapId}", ct);

                    if (resp.StatusCode == System.Net.HttpStatusCode.NotFound)
                    { notFound++; continue; }

                    if (!resp.IsSuccessStatusCode)
                    { errors++; continue; }

                    var body = await resp.Content.ReadAsStringAsync(ct);
                    var el   = JsonDocument.Parse(body).RootElement;

                    var externalId  = Str(el, "assetId","AssetId","id","Id") ?? Int(el, "assetId","AssetId","id","Id") ?? gapId.ToString();
                    var parentId    = Int(el, "parentAssetId","ParentAssetId") ?? Str(el, "parentAssetId","ParentAssetId");
                    if (parentId == "0") parentId = null;

                    // Skip if the asset has no meaningful identifier — the ID gap is a deleted/phantom record
                    var assetNumber = Str(el, "assetNumber","AssetNumber","assetName","AssetName","name","Name");
                    if (string.IsNullOrWhiteSpace(assetNumber))
                    { notFound++; continue; }

                    var displayName = assetNumber;
                    var category    = Str(el, "assetCategory","AssetCategory","assetType","AssetType");
                    var location    = Str(el, "location","Location","locationName","LocationName");
                    var isActive    = Bool(el, "isActive","IsActive","active","Active") ?? true;
                    var modifiedAt  = Dt(el, "modifiedDateTime","ModifiedDateTime","modifiedAt","updatedAt");

                    // Skip if it appeared in the DB since we loaded the gap list
                    if (await db.ExternalAssets.AnyAsync(a => a.Source == "mex" && a.ExternalId == externalId, ct))
                    { continue; }

                    db.ExternalAssets.Add(new ExternalAsset
                    {
                        Source           = "mex",
                        ExternalId       = externalId,
                        ParentExternalId = parentId,
                        DisplayName      = displayName,
                        Category         = category,
                        Location         = location,
                        IsActive         = isActive,
                        RawJson          = body,
                        SourceModifiedAt = modifiedAt,
                        LastSyncedAt     = now,
                    });

                    fetched++;

                    // Save in small batches to reduce memory pressure
                    if (fetched % 50 == 0)
                    {
                        await db.SaveChangesAsync(ct);
                        logger.LogInformation("MexGapFillJob: progress — {Fetched} fetched, {NotFound} not found, {Errors} errors (of {Total} gaps)",
                            fetched, notFound, errors, gapIds.Count);
                    }
                }
                catch (OperationCanceledException) { throw; }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "MexGapFillJob: error fetching /Asset/{Id}", gapId);
                    errors++;
                }
            }

            await db.SaveChangesAsync(ct);

            var summary = JsonSerializer.Serialize(new
            {
                min_id    = minId,
                max_id    = maxId,
                gaps      = gapIds.Count,
                fetched,
                not_found = notFound,
                errors,
                source    = "mex",
            });

            logger.LogInformation("MexGapFillJob: complete — {Summary}", summary);
            await eventBus.PublishAsync(new JobCompletedEvent(JobKey, summary));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "MexGapFillJob failed");
            await eventBus.PublishAsync(new JobFailedEvent(JobKey, ex.Message));
        }
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private static string? Str(JsonElement el, params string[] keys)
    {
        foreach (var k in keys)
            if (el.TryGetProperty(k, out var p) && p.ValueKind == JsonValueKind.String)
                return p.GetString();
        return null;
    }

    private static string? Int(JsonElement el, params string[] keys)
    {
        foreach (var k in keys)
            if (el.TryGetProperty(k, out var p) && p.ValueKind == JsonValueKind.Number)
                return p.GetRawText();
        return null;
    }

    private static bool? Bool(JsonElement el, params string[] keys)
    {
        foreach (var k in keys)
            if (el.TryGetProperty(k, out var p) &&
                p.ValueKind is JsonValueKind.True or JsonValueKind.False)
                return p.GetBoolean();
        return null;
    }

    private static DateTime? Dt(JsonElement el, params string[] keys)
    {
        foreach (var k in keys)
            if (el.TryGetProperty(k, out var p) && p.ValueKind == JsonValueKind.String)
            {
                var s = p.GetString();
                if (s is not null && DateTime.TryParse(s, out var dt))
                    return DateTime.SpecifyKind(dt, DateTimeKind.Utc);
            }
        return null;
    }
}
