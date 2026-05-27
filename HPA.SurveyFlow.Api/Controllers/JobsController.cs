using HPA.SurveyFlow.Api.Authorization;
using HPA.SurveyFlow.Api.Extensions;
using HPA.SurveyFlow.Domain.Security;
using HPA.SurveyFlow.Infrastructure.Data;
using HPA.SurveyFlow.Infrastructure.Jobs.Scheduling;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Quartz;

namespace HPA.SurveyFlow.Api.Controllers;

[ApiController]
[Route("api/jobs")]
public class JobsController(AppDbContext db, ISchedulerFactory schedulerFactory, JobScheduler jobScheduler) : ControllerBase
{
    [HttpGet]
    [RequirePermission(Permissions.Jobs.Read)]
    public async Task<IActionResult> List()
    {
        var jobs = await db.ScheduledJobDefinitions.OrderBy(j => j.DisplayName).ToListAsync();
        var scheduler = await schedulerFactory.GetScheduler();
        var result = new List<object>();

        foreach (var job in jobs)
        {
            var lastRun = await db.JobRuns
                .Where(r => r.JobKey == job.JobKey)
                .OrderByDescending(r => r.StartedAt)
                .Select(r => new
                {
                    status = r.Status,
                    started_at = r.StartedAt,
                    completed_at = r.CompletedAt,
                    result_summary = r.ResultSummary,
                    error_message = r.ErrorMessage,
                    trigger_type = r.TriggerType,
                })
                .FirstOrDefaultAsync();

            DateTimeOffset? nextRun = null;
            try
            {
                var quartzKey = new JobKey(job.JobKey, "surveyflow");
                var triggers = await scheduler.GetTriggersOfJob(quartzKey);
                nextRun = triggers.Select(t => t.GetNextFireTimeUtc()).Where(t => t.HasValue)
                    .OrderBy(t => t!.Value).FirstOrDefault();
            }
            catch
            {
                // Disabled jobs may not exist in Quartz.
            }

            result.Add(new
            {
                id = job.Id,
                job_key = job.JobKey,
                display_name = job.DisplayName,
                description = job.Description,
                cron_expression = job.CronExpression,
                is_enabled = job.IsEnabled,
                sync_mode = job.SyncMode,
                only_update_changed = job.OnlyUpdateChanged,
                parameter_schema = job.ParameterSchema,
                default_parameters = job.DefaultParameters,
                created_at = job.CreatedAt,
                updated_at = job.UpdatedAt,
                last_run = lastRun,
                next_run_at = nextRun?.UtcDateTime,
            });
        }

        return Ok(result);
    }

    [HttpGet("{key}/runs")]
    [RequirePermission(Permissions.Jobs.Read)]
    public async Task<IActionResult> GetRuns(string key, [FromQuery] int limit = 50, [FromQuery] int offset = 0)
    {
        var total = await db.JobRuns.CountAsync(r => r.JobKey == key);
        var items = await db.JobRuns
            .Where(r => r.JobKey == key)
            .OrderByDescending(r => r.StartedAt)
            .Skip(offset)
            .Take(limit)
            .Select(r => MapRun(r))
            .ToListAsync();

        return Ok(new { items, total, limit, offset });
    }

    [HttpGet("runs")]
    [RequirePermission(Permissions.Jobs.Read)]
    public async Task<IActionResult> GetAllRuns([FromQuery] int limit = 50, [FromQuery] int offset = 0)
    {
        var total = await db.JobRuns.CountAsync();
        var items = await db.JobRuns
            .OrderByDescending(r => r.StartedAt)
            .Skip(offset)
            .Take(limit)
            .Select(r => MapRun(r))
            .ToListAsync();

        return Ok(new { items, total, limit, offset });
    }

    [HttpPost("{key}/trigger")]
    [RequirePermission(Permissions.Jobs.Manage)]
    public async Task<IActionResult> Trigger(string key, [FromBody] TriggerJobRequest? body = null)
    {
        var def = await db.ScheduledJobDefinitions.FirstOrDefaultAsync(j => j.JobKey == key);
        if (def is null) return NotFound(new { error = "Job not found." });

        var currentUser = HttpContext.GetCurrentUser();
        var quartzKey = new JobKey(key, "surveyflow");
        var scheduler = await schedulerFactory.GetScheduler();

        if (!await scheduler.CheckExists(quartzKey))
        {
            var jobType = ResolveJobType(def.JobType);
            if (jobType is null) return BadRequest(new { error = "Could not resolve job type." });
            await scheduler.AddJob(
                JobBuilder.Create(jobType).WithIdentity(quartzKey).StoreDurably().Build(),
                replace: true);
        }

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
                var parameters = new HPA.SurveyFlow.Domain.Jobs.DateRangeJobParameters(
                    dateFrom.Value,
                    dateTo,
                    PurgeBeforeSync: body.PurgeBeforeSync == true);

                dataMap.Add("parameters",
                    System.Text.Json.JsonSerializer.Serialize(
                        parameters,
                        new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web)));
            }
        }

        await scheduler.TriggerJob(quartzKey, dataMap);

        return Ok(new { success = true, message = $"Job '{def.DisplayName}' triggered." });
    }

    [HttpPost("{key}/interrupt")]
    [RequirePermission(Permissions.Jobs.Manage)]
    public async Task<IActionResult> Interrupt(string key)
    {
        var scheduler = await schedulerFactory.GetScheduler();
        var quartzKey = new JobKey(key, "surveyflow");
        var interrupted = await scheduler.Interrupt(quartzKey);

        var stuckRuns = await db.JobRuns
            .Where(r => r.JobKey == key && r.Status == "running")
            .ToListAsync();

        foreach (var run in stuckRuns)
        {
            run.Status = "failed";
            run.CompletedAt = DateTime.UtcNow;
            run.ErrorMessage = "Manually interrupted by an authorized user.";
        }

        await db.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            interrupted,
            runs_marked = stuckRuns.Count,
            message = interrupted
                ? $"Job '{key}' interrupted."
                : $"Job '{key}' was not running in Quartz, but {stuckRuns.Count} stuck run(s) cleared.",
        });
    }

    [HttpPut("{key}")]
    [RequirePermission(Permissions.Jobs.Manage)]
    public async Task<IActionResult> Update(string key, [FromBody] UpdateJobRequest body)
    {
        var def = await db.ScheduledJobDefinitions.FirstOrDefaultAsync(j => j.JobKey == key);
        if (def is null) return NotFound(new { error = "Job not found." });

        if (body.CronExpression != null)
        {
            if (!IsValidCron(body.CronExpression))
                return BadRequest(new { error = "Invalid cron expression." });
            def.CronExpression = body.CronExpression;
        }

        if (body.IsEnabled.HasValue) def.IsEnabled = body.IsEnabled.Value;
        if (body.Description != null) def.Description = body.Description;
        if (body.SyncMode != null) def.SyncMode = body.SyncMode;
        if (body.OnlyUpdateChanged.HasValue) def.OnlyUpdateChanged = body.OnlyUpdateChanged.Value;

        def.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        await jobScheduler.ApplyAsync();

        return Ok(new
        {
            success = true,
            job = new { job_key = def.JobKey, is_enabled = def.IsEnabled, cron_expression = def.CronExpression },
        });
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
        try
        {
            CronExpression.ValidateExpression(expr);
            return true;
        }
        catch
        {
            return false;
        }
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

public class UpdateJobRequest
{
    public string? CronExpression { get; set; }
    public bool? IsEnabled { get; set; }
    public string? Description { get; set; }
    public string? SyncMode { get; set; }
    public bool? OnlyUpdateChanged { get; set; }
}

public class TriggerJobRequest
{
    public DateTime? DateFrom { get; set; }
    public DateTime? DateTo { get; set; }
    public bool? FullHistorical { get; set; }
    public bool? PurgeBeforeSync { get; set; }
}
