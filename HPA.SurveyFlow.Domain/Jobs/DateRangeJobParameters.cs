namespace HPA.SurveyFlow.Domain.Jobs;

/// <summary>
/// Generic date-range parameters for any job that fetches time-windowed data.
/// The window chunk size is managed internally by the adaptive algorithm —
/// callers only provide the overall DateFrom/DateTo range.
/// </summary>
public record DateRangeJobParameters(
    DateTime DateFrom,
    DateTime DateTo,
    bool PurgeBeforeSync = false  // delete all existing records before syncing (dev/UAT only)
) : IJobParameters;
