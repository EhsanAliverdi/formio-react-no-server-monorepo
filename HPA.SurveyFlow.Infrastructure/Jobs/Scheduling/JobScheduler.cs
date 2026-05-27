using HPA.SurveyFlow.Domain.Entities;
using HPA.SurveyFlow.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Quartz;

namespace HPA.SurveyFlow.Infrastructure.Jobs.Scheduling;

/// <summary>
/// Reads ScheduledJobDefinition rows from the DB and registers them with the Quartz scheduler.
/// Called at startup and can be called again to re-apply changes (e.g. after toggling or editing).
/// </summary>
public sealed class JobScheduler(
    ISchedulerFactory schedulerFactory,  // ISchedulerFactory IS injectable; IScheduler is not
    AppDbContext db,
    ILogger<JobScheduler> logger)
{
    public async Task ApplyAsync(CancellationToken ct = default)
    {
        var scheduler = await schedulerFactory.GetScheduler(ct);
        var definitions = await db.ScheduledJobDefinitions.ToListAsync(ct);

        foreach (var def in definitions)
        {
            var jobType = ResolveJobType(def.JobType);
            if (jobType is null)
            {
                logger.LogWarning("JobScheduler: could not resolve type '{JobType}' for job '{Key}' — skipping.", def.JobType, def.JobKey);
                continue;
            }

            var quartzKey = new JobKey(def.JobKey, "surveyflow");

            // Remove any existing trigger for this job so we can re-apply cleanly
            if (await scheduler.CheckExists(quartzKey, ct))
                await scheduler.DeleteJob(quartzKey, ct);

            if (!def.IsEnabled)
            {
                logger.LogInformation("JobScheduler: job '{Key}' is disabled — not scheduling.", def.JobKey);
                continue;
            }

            var job = JobBuilder.Create(jobType)
                .WithIdentity(quartzKey)
                .WithDescription(def.DisplayName)
                .Build();

            var trigger = TriggerBuilder.Create()
                .WithIdentity($"{def.JobKey}-trigger", "surveyflow")
                .WithCronSchedule(def.CronExpression)
                .Build();

            await scheduler.ScheduleJob(job, trigger, ct);
            logger.LogInformation("JobScheduler: scheduled '{Key}' with cron '{Cron}'.", def.JobKey, def.CronExpression);
        }
    }

    private static Type? ResolveJobType(string typeName)
    {
        // Search all loaded assemblies — allows jobs in Infrastructure without hard coupling
        foreach (var assembly in AppDomain.CurrentDomain.GetAssemblies())
        {
            var type = assembly.GetType(typeName);
            if (type is not null) return type;
        }
        return null;
    }
}
