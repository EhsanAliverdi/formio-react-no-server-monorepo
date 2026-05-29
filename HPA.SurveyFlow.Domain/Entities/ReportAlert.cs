namespace HPA.SurveyFlow.Domain.Entities;

/// <summary>
/// Threshold-based alert rule evaluated on a schedule against a report template.
/// When the extracted metric crosses the threshold the alert fires — email and/or webhook.
/// </summary>
public class ReportAlert
{
    public int Id { get; set; }
    public int ReportTemplateId { get; set; }
    public string Name { get; set; } = null!;

    /// <summary>Aggregation alias or column field_key to extract the metric value from the result.</summary>
    public string ConditionField { get; set; } = null!;

    /// <summary>gt | lt | gte | lte | eq | neq</summary>
    public string ConditionOperator { get; set; } = "gt";

    public decimal Threshold { get; set; }

    /// <summary>5-part cron for evaluation frequency, e.g. "0 8 * * 1" = Mon 08:00.</summary>
    public string EvaluationCron { get; set; } = null!;

    /// <summary>Comma-separated email addresses. Empty = email disabled.</summary>
    public string Recipients { get; set; } = string.Empty;

    /// <summary>Optional webhook URL to POST when alert fires.</summary>
    public string? WebhookUrl { get; set; }

    public bool IsEnabled { get; set; } = true;
    public int CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? LastEvaluatedAt { get; set; }
    public DateTime? LastTriggeredAt { get; set; }
    public decimal? LastValue { get; set; }

    /// <summary>ok | triggered | error</summary>
    public string? LastStatus { get; set; }
    public string? LastError { get; set; }

    public ReportTemplate ReportTemplate { get; set; } = null!;
    public User CreatedByUser { get; set; } = null!;
}
