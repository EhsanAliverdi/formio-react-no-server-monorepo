using System.Text.Json;
using HPA.SurveyFlow.Domain.Events;
using HPA.SurveyFlow.Domain.Jobs;
using HPA.SurveyFlow.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Quartz;

namespace HPA.SurveyFlow.Infrastructure.Jobs.Abstractions;

/// <summary>
/// Base class for all data-synchronisation jobs.
///
/// Provides the complete framework pipeline:
///   adaptive windowed fetch → change detection → bulk upsert → event publishing
///
/// Job authors implement three abstract methods:
///   FetchPageAsync  — call the source API, return a page of records
///   LoadExistingAsync — bulk load existing records from DB by ExternalId
///   UpsertAsync     — write inserts/updates to DB
///
/// Everything else (delta/full mode, adaptive windows, onlyUpdateChanged,
/// last-run tracking, result summary, event lifecycle) is handled here.
/// </summary>
public abstract class SyncJobBase<TRecord>(
    AppDbContext db,
    IEventBus eventBus,
    ILogger logger) : IScheduledJob
    where TRecord : ISyncRecord
{
    protected AppDbContext Db { get; } = db;

    /// <summary>Unique job key — matches ScheduledJobDefinition.JobKey.</summary>
    protected abstract string GetJobKey();

    /// <summary>Display name used in logs and job run records.</summary>
    protected abstract string GetDisplayName();

    /// <summary>
    /// Fetch one page of records from the source API for the given date window.
    /// Return an empty list to signal "no more data" (triggers window growth or loop end).
    /// Throw on unrecoverable API errors.
    /// </summary>
    protected abstract Task<List<TRecord>> FetchPageAsync(
        DateTime windowFrom, DateTime windowTo,
        int pageNumber, int pageSize,
        CancellationToken ct);

    /// <summary>
    /// Load all existing records for the given ExternalIds in a single DB query.
    /// Return a dictionary keyed by ExternalId. Used to split fetch results into insert vs update.
    /// </summary>
    protected abstract Task<Dictionary<string, object>> LoadExistingAsync(
        IEnumerable<string> externalIds, CancellationToken ct);

    /// <summary>
    /// Persist the inserts and updates. Called once per window after change detection.
    /// </summary>
    protected abstract Task<UpsertResult> UpsertAsync(
        List<TRecord> toInsert,
        List<(TRecord Record, object Existing)> toUpdate,
        CancellationToken ct);

    /// <summary>
    /// Delete all existing records for this source before the sync begins.
    /// Only called when PurgeBeforeSync=true AND the environment is non-production.
    /// Override in each job implementation to delete the correct table rows.
    /// </summary>
    protected virtual Task<int> PurgeAsync(CancellationToken ct) =>
        Task.FromResult(0);

    /// <summary>
    /// Called after the main sync and upsert are complete.
    /// Override to perform post-sync validation and repair — e.g. fetching missing
    /// parent records that weren't in any date window.
    /// Default: no-op.
    /// </summary>
    protected virtual Task ValidateAndRepairAsync(CancellationToken ct) =>
        Task.CompletedTask;

    /// <summary>
    /// Override and return false when the source API does NOT support date-range filtering.
    /// When false, the framework uses pure pagination over the full dataset.
    /// Default: true.
    /// </summary>
    protected virtual bool SupportsDateFilter => true;

    /// <summary>
    /// Override and return false when the source API only supports date (yyyy-MM-dd) filtering,
    /// not time-of-day (HH:mm:ss). When false, the framework stops drilling at the day level.
    /// Default: true (full datetime filtering supported).
    /// </summary>
    protected virtual bool SupportsSubDayFilter => true;

    /// <summary>
    /// Override and return false when the source API ignores pageNumber on date-filtered queries
    /// (i.e. always returns the same first N records regardless of page).
    /// When false, each window accepts only page 1 — drilling to finer windows gets different records.
    /// When true (default), the framework paginates within each window.
    /// </summary>
    protected virtual bool SupportsPaginationWithinDateWindow => true;

    // ── Framework execute — sealed, not overridable ─────────────────────

    public async Task Execute(IJobExecutionContext context)
    {
        var jobKey  = GetJobKey();
        var display = GetDisplayName();
        var ct      = context.CancellationToken;
        var map     = context.MergedJobDataMap;
        var triggerType = (map.ContainsKey("trigger_type") ? map.GetString("trigger_type") : null) ?? "scheduled";
        var triggeredBy = map.ContainsKey("triggered_by") ? map.GetString("triggered_by") : null;

        await eventBus.PublishAsync(new JobStartedEvent(jobKey, display, triggerType, triggeredBy));

        try
        {
            // ── Load job configuration ─────────────────────────────────
            var jobDef = await Db.ScheduledJobDefinitions
                .FirstOrDefaultAsync(j => j.JobKey == jobKey, ct);
            var syncMode          = jobDef?.SyncMode ?? "delta";
            var onlyUpdateChanged = jobDef?.OnlyUpdateChanged ?? false;

            // ── Resolve parameters & date window ───────────────────────
            var provided = JobParameterContext.Get<DateRangeJobParameters>(context);
            var (dateFrom, dateTo) = ResolveWindow(provided, syncMode, jobKey);

            // ── Purge (dev/UAT only, manual trigger only) ──────────────
            var purgedCount = 0;
            if (provided?.PurgeBeforeSync == true)
            {
                var env = Environment.GetEnvironmentVariable("APP_ENVIRONMENT") ?? "production";
                var isProduction = env.Equals("production", StringComparison.OrdinalIgnoreCase);

                if (isProduction)
                {
                    logger.LogWarning("{Job}: PurgeBeforeSync requested but APP_ENVIRONMENT=production — skipping purge", display);
                }
                else
                {
                    logger.LogWarning("{Job}: purging all existing records (APP_ENVIRONMENT={Env})", display, env);
                    purgedCount = await PurgeAsync(ct);
                    logger.LogWarning("{Job}: purged {Count} records", display, purgedCount);
                }
            }


            logger.LogInformation(
                "{Job}: starting | trigger={Trigger} | mode={Mode} | onlyChanged={Changed} | {From:yyyy-MM-dd}→{To:yyyy-MM-dd} | purge={Purge}",
                display, triggerType, syncMode, onlyUpdateChanged, dateFrom, dateTo, provided?.PurgeBeforeSync == true);

            // ── Fetch: adaptive windowed OR pure pagination ────────────
            var (allRecords, windowsFetched) = SupportsDateFilter
                ? await FetchAllAdaptiveAsync(dateFrom, dateTo, display, ct)
                : await FetchAllPaginatedAsync(dateFrom, dateTo, display, ct);

            logger.LogInformation("{Job}: fetched {Total} records across {Windows} windows",
                display, allRecords.Count, windowsFetched);

            // ── Bulk load existing + change detection + upsert ────────
            var totalResult = UpsertResult.Empty;

            if (allRecords.Count > 0)
            {
                var existing = await LoadExistingAsync(allRecords.Select(r => r.ExternalId), ct);
                var (toInsert, toUpdate, unchanged) = SplitRecords(allRecords, existing, onlyUpdateChanged);

                var upsertResult = await UpsertAsync(toInsert, toUpdate, ct);
                totalResult = upsertResult with { Unchanged = upsertResult.Unchanged + unchanged };
            }

            // ── Post-sync validation (e.g. fetch missing parents) ─────
            await ValidateAndRepairAsync(ct);

            // ── Persist last-run window for next delta run ─────────────
            await SaveLastRunAsync(jobKey, dateFrom, dateTo, ct);

            var summary = JsonSerializer.Serialize(new
            {
                total          = allRecords.Count,
                inserted       = totalResult.Inserted,
                updated        = totalResult.Updated,
                skipped        = totalResult.Skipped,
                unchanged      = totalResult.Unchanged,
                windows_fetched = windowsFetched,
                date_from      = dateFrom.ToString("yyyy-MM-dd"),
                date_to        = dateTo.ToString("yyyy-MM-dd"),
                sync_mode      = syncMode,
                only_changed   = onlyUpdateChanged,
                purged         = purgedCount,
            });

            logger.LogInformation("{Job}: complete — {Summary}", display, summary);

            await eventBus.PublishAsync(new JobCompletedEvent(jobKey, summary));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "{Job}: failed", display);
            await eventBus.PublishAsync(new JobFailedEvent(jobKey, ex.Message));
        }
    }

    // ── Pure pagination (for APIs that don't support date filters) ──────

    private async Task<(List<TRecord> records, int pages)> FetchAllPaginatedAsync(
        DateTime dateFrom, DateTime dateTo, string display, CancellationToken ct)
    {
        const int pageSize = 1000;
        var allRecords = new List<TRecord>();
        int pageNumber = 1;
        int? serverCap = null;

        while (true)
        {
            ct.ThrowIfCancellationRequested();

            var page = await FetchPageAsync(dateFrom, dateTo, pageNumber, pageSize, ct);
            var count = page.Count;

            if (count == 0) break;

            allRecords.AddRange(page);
            logger.LogInformation("{Job}: page {Page} fetched {Count} records (total {Total})",
                display, pageNumber, count, allRecords.Count);

            // Detect the real server cap on the first non-empty response
            if (serverCap is null && count < pageSize)
            {
                // Less than requested — this is the last page
                break;
            }
            if (serverCap is null)
            {
                serverCap = count;
                logger.LogInformation("{Job}: server returns {Cap} records per page", display, serverCap);
            }

            // If we got fewer than the cap, we've reached the end
            if (count < serverCap.Value) break;

            pageNumber++;
        }

        return (allRecords, pageNumber);
    }

    // ── Adaptive windowed + paginated fetch ─────────────────────────────
    //
    // Granularity ladder (coarse → fine):
    //   days (31d → 1d) → hours (24 → 1) → minutes (60 → 1) → seconds (60 → 1)
    //
    // At each level: if page 1 hits the cap, drop to the next finer granularity.
    // At each level: if window is empty, double the window (up to the level's max).
    // At the finest level (1 second): paginate all pages — never skip records.
    // After completing a dense block, reset to the day level for the next range.

    private async Task<(List<TRecord> records, int windows)> FetchAllAdaptiveAsync(
        DateTime dateFrom, DateTime dateTo, string display, CancellationToken ct)
    {
        const int pageSize = 1000;

        var allRecords    = new List<TRecord>();
        int windowsFetched = 0;
        int? serverCap    = null;

        var windowStart = dateFrom;
        await FetchRangeAsync(windowStart, dateTo);

        return (allRecords, windowsFetched);

        // ── Recursive granularity drill-down ───────────────────────────
        async Task FetchRangeAsync(DateTime from, DateTime to)
        {
            // Granularity levels: each entry is (initial span in seconds, max, label).
            // When SupportsSubDayFilter=false (e.g. MEX date-only filtering),
            // stop at the day level and paginate within dense days instead of drilling to hours.
            var levels = SupportsSubDayFilter
                ? new[] {
                    (span: 31 * 86400,  max: 365 * 86400, label: "days"),
                    (span: 3600,        max: 24 * 3600,   label: "hours"),
                    (span: 60,          max: 60 * 60,     label: "minutes"),
                    (span: 1,           max: 60,          label: "seconds"),
                  }
                : new[] {
                    (span: 31 * 86400,  max: 365 * 86400, label: "days"),
                  };

            await FetchLevelAsync(from, to, levelIndex: 0, levels);
        }

        async Task FetchLevelAsync(DateTime from, DateTime to, int levelIndex,
            (int span, int max, string label)[] levels)
        {
            var (spanSec, maxSec, label) = levels[levelIndex];
            bool isFinest = levelIndex == levels.Length - 1;

            var current = from;
            double windowSec = spanSec;

            while (current < to)
            {
                ct.ThrowIfCancellationRequested();

                var end = current.AddSeconds(windowSec);
                if (end > to) end = to;
                if (end == current) break; // safety: prevent zero-width

                var page1 = await FetchPageAsync(current, end, 1, pageSize, ct);
                var count1 = page1.Count;

                // Update cap detection
                if (serverCap is null && count1 > 0 && count1 < pageSize)
                    serverCap = count1;

                var atCap = serverCap.HasValue && count1 >= serverCap.Value;

                if (count1 == 0)
                {
                    // Empty — grow window and always advance to avoid infinite loop
                    var grown = Math.Min(windowSec * 2, maxSec);
                    if (grown != windowSec)
                        logger.LogInformation("{Job}: [{Level}] {From:yyyy-MM-dd HH:mm:ss}→{To:yyyy-MM-dd HH:mm:ss} empty, growing {Old}s→{New}s",
                            display, label, current, end, (long)windowSec, (long)grown);
                    windowSec = grown;
                    current = end; // always advance — never re-probe the same window
                }
                else if (atCap && !isFinest)
                {
                    // Too many records — drill into the next finer level for this sub-range
                    logger.LogInformation("{Job}: [{Level}] {From:yyyy-MM-dd HH:mm:ss}→{To:yyyy-MM-dd HH:mm:ss} hit cap ({Count}), drilling to [{Next}]",
                        display, label, current, end, count1, levels[levelIndex + 1].label);
                    await FetchLevelAsync(current, end, levelIndex + 1, levels);
                    current = end;
                    // Reset to initial span for this level after the dense block
                    windowSec = spanSec;
                }
                else
                {
                    // Good window or finest level — accept page 1.
                    // Only paginate further if the API supports pageNumber on date-filtered queries.
                    var windowRecords = new List<TRecord>(page1);

                    if (SupportsPaginationWithinDateWindow)
                    {
                        var lastCount = count1;
                        var pg = 2;
                        while (serverCap.HasValue && lastCount >= serverCap.Value)
                        {
                            ct.ThrowIfCancellationRequested();
                            var pageN = await FetchPageAsync(current, end, pg, pageSize, ct);
                            lastCount = pageN.Count;
                            if (lastCount == 0) break;
                            windowRecords.AddRange(pageN);
                            if (pg % 10 == 0)
                                logger.LogInformation("{Job}: [{Level}] paginating {From:yyyy-MM-dd}→{To:yyyy-MM-dd} — page {Page}, window {Count}, total {Total}",
                                    display, label, current, end, pg, windowRecords.Count, allRecords.Count + windowRecords.Count);
                            pg++;
                        }
                        allRecords.AddRange(windowRecords);
                        windowsFetched++;
                        logger.LogInformation("{Job}: [{Level}] {From:yyyy-MM-dd HH:mm:ss}→{To:yyyy-MM-dd HH:mm:ss} fetched {Count} ({Pages}p, total {Total})",
                            display, label, current, end, windowRecords.Count, pg - 1, allRecords.Count);
                    }
                    else
                    {
                        // No pagination — accept page 1 only; drilling gets the next slice
                        allRecords.AddRange(windowRecords);
                        windowsFetched++;
                        logger.LogInformation("{Job}: [{Level}] {From:yyyy-MM-dd HH:mm:ss}→{To:yyyy-MM-dd HH:mm:ss} fetched {Count} (total {Total})",
                            display, label, current, end, windowRecords.Count, allRecords.Count);
                    }

                    current = end;
                    // After a good block, grow window back toward level max
                    windowSec = Math.Min(windowSec * 2, maxSec);
                }
            }
        }
    }

    // ── Change detection (framework internal) ──────────────────────────

    private static (List<TRecord> toInsert, List<(TRecord, object)> toUpdate, int unchanged)
        SplitRecords(List<TRecord> records, Dictionary<string, object> existing, bool onlyChanged)
    {
        var toInsert  = new List<TRecord>();
        var toUpdate  = new List<(TRecord, object)>();
        int unchanged = 0;

        foreach (var record in records)
        {
            if (!existing.TryGetValue(record.ExternalId, out var existingRecord))
            {
                toInsert.Add(record);
                continue;
            }

            if (onlyChanged && record.SourceModifiedAt.HasValue)
            {
                // Get the existing record's LastSyncedAt via duck typing
                var lastSynced = (existingRecord as dynamic)?.LastSyncedAt as DateTime?;
                if (lastSynced.HasValue && record.SourceModifiedAt.Value <= lastSynced.Value)
                {
                    unchanged++;
                    continue;
                }
            }

            toUpdate.Add((record, existingRecord));
        }

        return (toInsert, toUpdate, unchanged);
    }

    // ── Delta window resolution ─────────────────────────────────────────

    private (DateTime dateFrom, DateTime dateTo) ResolveWindow(
        DateRangeJobParameters? provided, string syncMode, string jobKey)
    {
        if (provided is not null)
            return (provided.DateFrom, provided.DateTo);

        var dateTo = DateTime.UtcNow;

        if (syncMode == "full")
            return (new DateTime(2000, 1, 1, 0, 0, 0, DateTimeKind.Utc), dateTo);

        var lastTo   = Db.SiteSettings.Find($"job.{jobKey}.last_run_date_to")?.Value;
        var dateFrom = lastTo is not null && DateTime.TryParse(lastTo, out var parsed)
            ? parsed
            : dateTo.AddDays(-7);

        return (dateFrom, dateTo);
    }

    private async Task SaveLastRunAsync(string jobKey, DateTime dateFrom, DateTime dateTo, CancellationToken ct)
    {
        await UpsertSettingAsync($"job.{jobKey}.last_run_date_from", dateFrom.ToString("o"), ct);
        await UpsertSettingAsync($"job.{jobKey}.last_run_date_to",   dateTo.ToString("o"),   ct);
        await Db.SaveChangesAsync(ct);
    }

    private async Task UpsertSettingAsync(string key, string value, CancellationToken ct)
    {
        var s = await Db.SiteSettings.FindAsync([key], ct);
        if (s is null) Db.SiteSettings.Add(new HPA.SurveyFlow.Domain.Entities.SiteSetting { Key = key, Value = value });
        else           s.Value = value;
    }
}
