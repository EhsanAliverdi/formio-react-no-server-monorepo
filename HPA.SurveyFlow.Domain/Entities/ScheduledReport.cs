namespace HPA.SurveyFlow.Domain.Entities;

/// <summary>
/// Schedules a report template to run on a cron expression and deliver
/// the result as a CSV email attachment to one or more recipients.
/// </summary>
public class ScheduledReport
{
    public int Id { get; set; }

    public int ReportTemplateId { get; set; }

    public string Name { get; set; } = null!;

    /// <summary>Standard cron expression (5-part, minute granularity). E.g. "0 7 * * 1" = Mon 07:00.</summary>
    public string CronExpression { get; set; } = null!;

    /// <summary>Comma-separated recipient email addresses.</summary>
    public string Recipients { get; set; } = null!;

    /// <summary>Email subject line. Supports {{ReportName}} and {{RunDate}} placeholders.</summary>
    public string Subject { get; set; } = "{{ReportName}} — {{RunDate}}";

    public bool IsEnabled { get; set; } = true;

    public int CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>UTC timestamp of the last successful delivery run.</summary>
    public DateTime? LastRunAt { get; set; }

    /// <summary>UTC timestamp when this schedule is next due to fire.</summary>
    public DateTime? NextRunAt { get; set; }

    /// <summary>Status of the last run: success | failed | null (never run).</summary>
    public string? LastRunStatus { get; set; }

    public string? LastRunError { get; set; }

    public ReportTemplate ReportTemplate { get; set; } = null!;
    public User CreatedByUser { get; set; } = null!;
}
