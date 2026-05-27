namespace HPA.SurveyFlow.Domain.Entities;

public class ScheduledJobDefinition
{
    public int Id { get; set; }
    public string JobKey { get; set; } = null!;         // unique slug e.g. "mex-asset-sync"
    public string JobType { get; set; } = null!;        // assembly-qualified type for resolution
    public string DisplayName { get; set; } = null!;
    public string? Description { get; set; }
    public string CronExpression { get; set; } = null!; // Quartz cron e.g. "0 0 * * * ?"
    public bool IsEnabled { get; set; }

    // ── Sync behaviour ─────────────────────────────────────────────────────

    /// <summary>
    /// "delta" (default): each scheduled run fetches only from the last run's end date to now.
    /// "full": each scheduled run always fetches all data from the beginning of time.
    /// Manual triggers always respect the explicit params passed by the user.
    /// </summary>
    public string SyncMode { get; set; } = "delta";

    /// <summary>
    /// When true, only upsert records whose source ModifiedAt is newer than our LastSyncedAt.
    /// When false (default), update every record received regardless of whether it changed.
    /// Requires the source API to return a modifiedAt / updatedAt field.
    /// </summary>
    public bool OnlyUpdateChanged { get; set; } = false;

    // ── Scheduled run parameters ───────────────────────────────────────────

    /// <summary>
    /// JSON-serialised IJobParameters injected when the job fires on its cron schedule.
    /// For delta mode this is computed automatically; for full mode this holds the full-history range.
    /// </summary>
    public string? DefaultParameters { get; set; }

    /// <summary>
    /// JSON array of parameter field names this job supports, e.g. ["dateFrom","dateTo","fullHistorical"].
    /// Drives the manual-trigger modal in the UI.
    /// </summary>
    public string? ParameterSchema { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
