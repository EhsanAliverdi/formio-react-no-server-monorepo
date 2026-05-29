using System.Text.Json;
using System.Text.Json.Serialization;

namespace HPA.SurveyFlow.Domain.DTOs.Requests;

public class SaveDatasetRequest
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = null!;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("form_id")]
    public int FormId { get; set; }

    [JsonPropertyName("base_filters")]
    public JsonElement? BaseFilters { get; set; }

    [JsonPropertyName("fields")]
    public JsonElement? Fields { get; set; }

    [JsonPropertyName("is_active")]
    public bool IsActive { get; set; } = true;
}

public class SaveScheduledReportRequest
{
    [JsonPropertyName("report_template_id")]
    public int ReportTemplateId { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = null!;

    [JsonPropertyName("cron_expression")]
    public string CronExpression { get; set; } = null!;

    [JsonPropertyName("recipients")]
    public string Recipients { get; set; } = null!;

    [JsonPropertyName("subject")]
    public string Subject { get; set; } = "{{ReportName}} — {{RunDate}}";

    [JsonPropertyName("is_enabled")]
    public bool IsEnabled { get; set; } = true;
}
