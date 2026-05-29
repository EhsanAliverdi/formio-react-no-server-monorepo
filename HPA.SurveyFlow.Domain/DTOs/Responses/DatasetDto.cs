using System.Text.Json;
using System.Text.Json.Serialization;

namespace HPA.SurveyFlow.Domain.DTOs.Responses;

public class DatasetDto
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = null!;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("form_id")]
    public int FormId { get; set; }

    [JsonPropertyName("form_name")]
    public string FormName { get; set; } = null!;

    [JsonPropertyName("base_filters")]
    public JsonElement? BaseFilters { get; set; }

    [JsonPropertyName("fields")]
    public JsonElement? Fields { get; set; }

    [JsonPropertyName("created_by")]
    public int CreatedBy { get; set; }

    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updated_at")]
    public DateTime UpdatedAt { get; set; }

    [JsonPropertyName("is_active")]
    public bool IsActive { get; set; }
}

public class ScheduledReportDto
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("report_template_id")]
    public int ReportTemplateId { get; set; }

    [JsonPropertyName("report_name")]
    public string ReportName { get; set; } = null!;

    [JsonPropertyName("name")]
    public string Name { get; set; } = null!;

    [JsonPropertyName("cron_expression")]
    public string CronExpression { get; set; } = null!;

    [JsonPropertyName("recipients")]
    public string Recipients { get; set; } = null!;

    [JsonPropertyName("subject")]
    public string Subject { get; set; } = null!;

    [JsonPropertyName("is_enabled")]
    public bool IsEnabled { get; set; }

    [JsonPropertyName("created_by")]
    public int CreatedBy { get; set; }

    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updated_at")]
    public DateTime UpdatedAt { get; set; }

    [JsonPropertyName("last_run_at")]
    public DateTime? LastRunAt { get; set; }

    [JsonPropertyName("next_run_at")]
    public DateTime? NextRunAt { get; set; }

    [JsonPropertyName("last_run_status")]
    public string? LastRunStatus { get; set; }

    [JsonPropertyName("last_run_error")]
    public string? LastRunError { get; set; }
}
