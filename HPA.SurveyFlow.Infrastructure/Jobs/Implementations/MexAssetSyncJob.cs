using System.Text.Json;
using HPA.SurveyFlow.Domain.Entities;
using HPA.SurveyFlow.Domain.Events;
using HPA.SurveyFlow.Domain.Jobs;
using HPA.SurveyFlow.Infrastructure.Data;
using HPA.SurveyFlow.Infrastructure.Jobs.Abstractions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HPA.SurveyFlow.Infrastructure.Jobs.Implementations;

// ── Domain record ────────────────────────────────────────────────────────────

/// <summary>One asset record as mapped from the MEX API response.</summary>
public sealed record MexAssetRecord(
    string ExternalId,
    string? ParentExternalId,
    string DisplayName,
    string? Category,
    string? Location,
    bool IsActive,
    string RawJson,
    DateTime? SourceModifiedAt
) : ISyncRecord;

// ── Job implementation ───────────────────────────────────────────────────────

/// <summary>
/// Syncs assets from MEX Maintenance → external_assets table.
///
/// This class contains ONLY domain logic:
///   - How to call the MEX API (FetchPageAsync)
///   - How to load existing records (LoadExistingAsync)
///   - How to write to the DB (UpsertAsync)
///
/// Everything else — adaptive windowing, delta/full mode, change detection,
/// event publishing, last-run tracking — is handled by SyncJobBase.
/// </summary>
[Quartz.DisallowConcurrentExecution]
public sealed class MexAssetSyncJob(
    AppDbContext db,
    IEventBus eventBus,
    ILogger<MexAssetSyncJob> logger)
    : SyncJobBase<MexAssetRecord>(db, eventBus, logger)
{
    public static string JobKey => "mex-asset-sync";
    protected override string GetJobKey()      => JobKey;
    protected override string GetDisplayName()  => "MEX Asset Sync";

    protected override bool SupportsDateFilter => true;
    // MEX ignores pageNumber on date-filtered queries — always returns same first 100 records.
    // Use sub-day drilling to get different 100-record slices, never paginate within a window.
    protected override bool SupportsSubDayFilter => true;
    protected override bool SupportsPaginationWithinDateWindow => false;

    // ── 0. Purge (dev/UAT only) ───────────────────────────────────────────────

    protected override async Task<int> PurgeAsync(CancellationToken ct)
    {
        var count = await db.ExternalAssets.CountAsync(a => a.Source == "mex", ct);
        await db.ExternalAssets.Where(a => a.Source == "mex").ExecuteDeleteAsync(ct);

        // Also clear the last-run tracking so the next scheduled run starts fresh
        await db.SiteSettings
            .Where(s => s.Key.StartsWith("job.mex-asset-sync.last_run_"))
            .ExecuteDeleteAsync(ct);

        return count;
    }

    // ── 1. Fetch one page from MEX ────────────────────────────────────────────

    protected override async Task<List<MexAssetRecord>> FetchPageAsync(
        DateTime windowFrom, DateTime windowTo,
        int pageNumber, int pageSize,
        CancellationToken ct)
    {
        var settings = (await db.SiteSettings.ToListAsync(ct))
            .ToDictionary(s => s.Key, s => s.Value);

        var baseUrl = settings.GetValueOrDefault("integration.mex.baseUrl");
        var apiKey  = settings.GetValueOrDefault("integration.mex.apiKey");
        var enabled = settings.GetValueOrDefault("integration.mex.enabled");

        if (enabled != "true" || string.IsNullOrWhiteSpace(baseUrl) || string.IsNullOrWhiteSpace(apiKey))
        {
            logger.LogInformation("MexAssetSyncJob: MEX not configured or disabled — skipping page");
            return [];
        }

        using var http = new System.Net.Http.HttpClient { Timeout = TimeSpan.FromMinutes(2) };
        http.DefaultRequestHeaders.Add("XApiKey", apiKey);
        var base_ = baseUrl.TrimEnd('/');

        // Probe endpoint on first call (page 1 only) to discover which URL works
        var endpoint = pageNumber == 1
            ? await ProbeEndpointAsync(http, base_, ct)
            : _cachedEndpoint;

        if (endpoint is null) return [];

        var url = $"{base_}{endpoint}?pageNumber={pageNumber}&pageSize={pageSize}" +
                  $"&dateFrom={windowFrom:yyyy-MM-dd}&dateTo={windowTo:yyyy-MM-dd}";

        try
        {
            var resp = await http.GetAsync(url, ct);
            if (!resp.IsSuccessStatusCode)
            {
                logger.LogWarning("MexAssetSyncJob: {Url} → HTTP {Status}", url, (int)resp.StatusCode);
                return [];
            }

            var body = await resp.Content.ReadAsStringAsync(ct);
            var doc  = JsonDocument.Parse(body).RootElement;
            var arr  = ExtractArray(doc);
            if (!arr.HasValue) return [];

            if (pageNumber == 1 && arr.Value.GetArrayLength() > 0)
                logger.LogInformation("MexAssetSyncJob: first record keys: {Keys}",
                    string.Join(", ", arr.Value.EnumerateArray().First().EnumerateObject().Select(p => p.Name)));

            return arr.Value.EnumerateArray().Select(MapRecord).Where(r => r is not null).ToList()!;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "MexAssetSyncJob: failed fetching {Url}", url);
            return [];
        }
    }

    // ── 2. Load existing records from DB ──────────────────────────────────────

    protected override async Task<Dictionary<string, object>> LoadExistingAsync(
        IEnumerable<string> externalIds, CancellationToken ct)
    {
        var ids = externalIds.ToList();
        return (await db.ExternalAssets
            .Where(a => a.Source == "mex" && ids.Contains(a.ExternalId))
            .ToListAsync(ct))
            .ToDictionary<ExternalAsset, string, object>(a => a.ExternalId, a => a);
    }

    // ── 3. Bulk upsert ────────────────────────────────────────────────────────

    protected override async Task<UpsertResult> UpsertAsync(
        List<MexAssetRecord> toInsert,
        List<(MexAssetRecord Record, object Existing)> toUpdate,
        CancellationToken ct)
    {
        var now = DateTime.UtcNow;

        foreach (var r in toInsert)
            db.ExternalAssets.Add(new ExternalAsset
            {
                Source            = "mex",
                ExternalId        = r.ExternalId,
                ParentExternalId  = r.ParentExternalId,
                DisplayName       = r.DisplayName,
                Category          = r.Category,
                Location          = r.Location,
                IsActive          = r.IsActive,
                RawJson           = r.RawJson,
                SourceModifiedAt  = r.SourceModifiedAt,
                LastSyncedAt      = now,
            });

        foreach (var (r, existing) in toUpdate)
        {
            var asset = (ExternalAsset)existing;
            asset.ParentExternalId = r.ParentExternalId;
            asset.DisplayName      = r.DisplayName;
            asset.Category         = r.Category;
            asset.Location         = r.Location;
            asset.IsActive         = r.IsActive;
            asset.RawJson          = r.RawJson;
            asset.SourceModifiedAt = r.SourceModifiedAt;
            asset.LastSyncedAt     = now;
        }

        await db.SaveChangesAsync(ct);
        return new UpsertResult(toInsert.Count, toUpdate.Count, 0, 0);
    }

    // ── 4. Parent validation: fetch any missing parents individually ──────────

    /// <summary>
    /// After the main sync, find records whose ParentExternalId doesn't exist in our DB
    /// (the parent was never in any date window) and fetch them one by one via /Asset/{id}.
    /// Repeats until no more missing parents are found (handles multi-level chains).
    /// </summary>
    protected override async Task ValidateAndRepairAsync(CancellationToken ct)
    {
        var settings = (await db.SiteSettings.ToListAsync(ct))
            .ToDictionary(s => s.Key, s => s.Value);

        var baseUrl = settings.GetValueOrDefault("integration.mex.baseUrl");
        var apiKey  = settings.GetValueOrDefault("integration.mex.apiKey");
        if (string.IsNullOrWhiteSpace(baseUrl) || string.IsNullOrWhiteSpace(apiKey)) return;

        using var http = new System.Net.Http.HttpClient { Timeout = TimeSpan.FromSeconds(30) };
        http.DefaultRequestHeaders.Add("XApiKey", apiKey);
        var base_ = baseUrl.TrimEnd('/');

        int totalFetched = 0;
        int pass = 0;

        // Repeat until no new missing parents found (handles grandparent chains)
        while (true)
        {
            pass++;
            ct.ThrowIfCancellationRequested();

            // All parent IDs referenced by our assets
            var referencedParentIds = await db.ExternalAssets
                .Where(a => a.Source == "mex" && a.ParentExternalId != null)
                .Select(a => a.ParentExternalId!)
                .Distinct()
                .ToListAsync(ct);

            if (referencedParentIds.Count == 0) break;

            // Which of those parents don't exist in our DB?
            var existingIds = await db.ExternalAssets
                .Where(a => a.Source == "mex" && referencedParentIds.Contains(a.ExternalId))
                .Select(a => a.ExternalId)
                .ToListAsync(ct);

            var missingIds = referencedParentIds.Except(existingIds).ToList();
            if (missingIds.Count == 0) break;

            logger.LogInformation("MexAssetSyncJob: pass {Pass} — {Count} missing parent(s) to fetch",
                pass, missingIds.Count);

            var now = DateTime.UtcNow;
            int fetched = 0;

            foreach (var parentId in missingIds)
            {
                ct.ThrowIfCancellationRequested();
                try
                {
                    var resp = await http.GetAsync($"{base_}/Asset/{parentId}", ct);
                    if (!resp.IsSuccessStatusCode)
                    {
                        logger.LogWarning("MexAssetSyncJob: /Asset/{Id} → HTTP {Status} — parent may be deleted",
                            parentId, (int)resp.StatusCode);
                        continue;
                    }

                    var body = await resp.Content.ReadAsStringAsync(ct);
                    var el   = JsonDocument.Parse(body).RootElement;
                    var rec  = MapRecord(el);
                    if (rec is null) continue;

                    // Only insert if still missing (concurrent run guard)
                    if (!await db.ExternalAssets.AnyAsync(
                            a => a.Source == "mex" && a.ExternalId == rec.ExternalId, ct))
                    {
                        db.ExternalAssets.Add(new ExternalAsset
                        {
                            Source           = "mex",
                            ExternalId       = rec.ExternalId,
                            ParentExternalId = rec.ParentExternalId,
                            DisplayName      = rec.DisplayName,
                            Category         = rec.Category,
                            Location         = rec.Location,
                            IsActive         = rec.IsActive,
                            RawJson          = rec.RawJson,
                            SourceModifiedAt = rec.SourceModifiedAt,
                            LastSyncedAt     = now,
                        });
                        fetched++;
                    }
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "MexAssetSyncJob: failed fetching parent /Asset/{Id}", parentId);
                }
            }

            if (fetched > 0)
            {
                await db.SaveChangesAsync(ct);
                totalFetched += fetched;
                logger.LogInformation("MexAssetSyncJob: pass {Pass} fetched {Count} missing parent(s)", pass, fetched);
            }

            // If we didn't fetch anything new this pass, no point looping
            if (fetched == 0) break;
        }

        if (totalFetched > 0)
            logger.LogInformation("MexAssetSyncJob: parent validation complete — {Total} parent(s) added", totalFetched);
    }

    // ── MEX-specific helpers ──────────────────────────────────────────────────

    private string? _cachedEndpoint;

    private async Task<string?> ProbeEndpointAsync(
        System.Net.Http.HttpClient http, string base_, CancellationToken ct)
    {
        if (_cachedEndpoint is not null) return _cachedEndpoint;

        string[] candidates = ["/Asset/GetAll", "/Asset/GetAllAssets", "/assets", "/Asset"];
        foreach (var candidate in candidates)
        {
            var resp = await http.GetAsync(base_ + candidate, ct);
            logger.LogInformation("MexAssetSyncJob: probing {Url} → HTTP {Status}", candidate, (int)resp.StatusCode);
            if (resp.IsSuccessStatusCode) { _cachedEndpoint = candidate; return candidate; }
        }
        return null;
    }

    private static MexAssetRecord? MapRecord(JsonElement el)
    {
        var externalId = Str(el, "assetId", "AssetId", "id", "Id") ?? Int(el, "assetId", "AssetId", "id", "Id");
        if (string.IsNullOrWhiteSpace(externalId)) return null;

        return new MexAssetRecord(
            ExternalId:       externalId,
            // parentAssetId=0 means no parent in MEX — store null, not "0"
            ParentExternalId: NullableInt(el, "parentAssetId", "ParentAssetId") ?? Str(el, "parentAssetId", "ParentAssetId"),
            DisplayName:      Str(el, "assetName", "AssetName", "assetNumber", "AssetNumber", "name", "Name", "displayName") ?? externalId,
            Category:         Str(el, "assetCategory", "AssetCategory", "category", "Category", "assetType", "AssetType"),
            Location:         Str(el, "location", "Location", "locationName", "LocationName", "site", "Site"),
            IsActive:         Bool(el, "isActive", "IsActive", "active", "Active") ?? true,
            RawJson:         el.GetRawText(),
            SourceModifiedAt: Dt(el, "modifiedAt", "ModifiedAt", "updatedAt", "UpdatedAt", "lastModified", "LastModified")
        );
    }

    private static JsonElement? ExtractArray(JsonElement root)
    {
        if (root.ValueKind == JsonValueKind.Array) return root;
        if (root.ValueKind != JsonValueKind.Object) return null;
        foreach (var name in new[] { "assets", "data", "items", "result", "records" })
            if (root.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.Array) return v;
        return null;
    }

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

    /// <summary>Like Int but returns null for zero (used for parentAssetId where 0 = no parent).</summary>
    private static string? NullableInt(JsonElement el, params string[] keys)
    {
        foreach (var k in keys)
            if (el.TryGetProperty(k, out var p) && p.ValueKind == JsonValueKind.Number)
            {
                var raw = p.GetRawText();
                return raw == "0" ? null : raw;
            }
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
