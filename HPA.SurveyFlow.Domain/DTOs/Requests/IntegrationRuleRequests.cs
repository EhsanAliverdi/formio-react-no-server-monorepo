using System.Text.Json.Serialization;

namespace HPA.SurveyFlow.Domain.DTOs.Requests;

public class SaveIntegrationRuleRequest
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = null!;

    [JsonPropertyName("enabled")]
    public bool Enabled { get; set; } = true;

    [JsonPropertyName("channel")]
    public string Channel { get; set; } = "mex";

    [JsonPropertyName("condition_group")]
    public object ConditionGroup { get; set; } = null!;

    [JsonPropertyName("sort_order")]
    public int SortOrder { get; set; } = 0;

    [JsonPropertyName("mex_config")]
    public SaveIntegrationRuleMexRequest? MexConfig { get; set; }

    [JsonPropertyName("webhook_config")]
    public SaveIntegrationRuleWebhookRequest? WebhookConfig { get; set; }
}

public class SaveIntegrationRuleMexRequest
{
    [JsonPropertyName("action")]
    public string Action { get; set; } = "create_request";

    [JsonPropertyName("contact_id_field")]
    public string? ContactIdField { get; set; }

    [JsonPropertyName("job_type_field")]
    public string? JobTypeField { get; set; }

    /// <summary>Raw JSON object: Record&lt;mexField, MexFieldMapping&gt;</summary>
    [JsonPropertyName("field_mappings")]
    public object FieldMappings { get; set; } = new { };
}

public class SaveIntegrationRuleWebhookRequest
{
    [JsonPropertyName("url")]
    public string Url { get; set; } = string.Empty;

    [JsonPropertyName("method")]
    public string Method { get; set; } = "POST";

    /// <summary>Raw JSON array: [{name, value}]</summary>
    [JsonPropertyName("headers")]
    public object Headers { get; set; } = Array.Empty<object>();

    [JsonPropertyName("body_template")]
    public string BodyTemplate { get; set; } = string.Empty;
}
