using System.Text.Json;
using System.Text.Json.Serialization;

namespace HPA.SurveyFlow.Domain.DTOs.Responses;

public class IntegrationRuleDto
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("form_id")]
    public int FormId { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = null!;

    [JsonPropertyName("enabled")]
    public bool Enabled { get; set; }

    [JsonPropertyName("channel")]
    public string Channel { get; set; } = null!;

    [JsonPropertyName("condition_group")]
    public JsonElement ConditionGroup { get; set; }

    [JsonPropertyName("sort_order")]
    public int SortOrder { get; set; }

    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updated_at")]
    public DateTime UpdatedAt { get; set; }

    [JsonPropertyName("mex_config")]
    public IntegrationRuleMexDto? MexConfig { get; set; }

    [JsonPropertyName("webhook_config")]
    public IntegrationRuleWebhookDto? WebhookConfig { get; set; }
}

public class IntegrationRuleMexDto
{
    [JsonPropertyName("action")]
    public string Action { get; set; } = "create_request";

    [JsonPropertyName("field_mappings")]
    public JsonElement FieldMappings { get; set; }
}

public class IntegrationRuleWebhookDto
{
    [JsonPropertyName("url")]
    public string Url { get; set; } = string.Empty;

    [JsonPropertyName("method")]
    public string Method { get; set; } = "POST";

    [JsonPropertyName("headers")]
    public JsonElement Headers { get; set; }

    [JsonPropertyName("body_template")]
    public string BodyTemplate { get; set; } = string.Empty;
}
