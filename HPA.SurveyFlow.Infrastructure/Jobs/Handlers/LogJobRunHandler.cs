using HPA.SurveyFlow.Domain.Entities;
using HPA.SurveyFlow.Domain.Events;
using HPA.SurveyFlow.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HPA.SurveyFlow.Infrastructure.Jobs.Handlers;

/// <summary>
/// Handles all three job lifecycle events and persists a JobRun row for the dashboard.
/// </summary>
public sealed class LogJobRunHandler(AppDbContext db, ILogger<LogJobRunHandler> logger)
    : IEventHandler<JobStartedEvent>,
      IEventHandler<JobCompletedEvent>,
      IEventHandler<JobFailedEvent>
{
    public async Task HandleAsync(JobStartedEvent e, CancellationToken ct)
    {
        db.JobRuns.Add(new JobRun
        {
            JobKey = e.JobKey,
            DisplayName = e.DisplayName,
            TriggerType = e.TriggerType,
            TriggeredByEmail = e.TriggeredByEmail,
            StartedAt = DateTime.UtcNow,
            Status = "running",
        });
        await db.SaveChangesAsync(ct);
        logger.LogInformation("Job started: {Key} (trigger={Trigger})", e.JobKey, e.TriggerType);
    }

    public async Task HandleAsync(JobCompletedEvent e, CancellationToken ct)
    {
        var run = await Latest(e.JobKey, ct);
        if (run is null) return;
        run.Status = "success";
        run.CompletedAt = DateTime.UtcNow;
        run.ResultSummary = e.ResultSummary;
        await db.SaveChangesAsync(ct);
        logger.LogInformation("Job completed: {Key} — {Summary}", e.JobKey, e.ResultSummary);
    }

    public async Task HandleAsync(JobFailedEvent e, CancellationToken ct)
    {
        var run = await Latest(e.JobKey, ct);
        if (run is null) return;
        run.Status = "failed";
        run.CompletedAt = DateTime.UtcNow;
        run.ErrorMessage = e.ErrorMessage;
        await db.SaveChangesAsync(ct);
        logger.LogError("Job failed: {Key} — {Error}", e.JobKey, e.ErrorMessage);
    }

    private Task<JobRun?> Latest(string jobKey, CancellationToken ct) =>
        db.JobRuns
          .Where(r => r.JobKey == jobKey && r.Status == "running")
          .OrderByDescending(r => r.StartedAt)
          .FirstOrDefaultAsync(ct);
}
