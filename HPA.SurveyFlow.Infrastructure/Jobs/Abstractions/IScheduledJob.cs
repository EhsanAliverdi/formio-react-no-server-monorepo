using Quartz;

namespace HPA.SurveyFlow.Infrastructure.Jobs.Abstractions;

/// <summary>
/// Marker interface for all SurveyFlow scheduled jobs.
/// Inherit from SyncJobBase&lt;TRecord&gt; for data-sync jobs (handles all framework concerns).
/// Implement this interface directly only for non-sync jobs that don't fit the sync pattern.
/// </summary>
public interface IScheduledJob : IJob { }
