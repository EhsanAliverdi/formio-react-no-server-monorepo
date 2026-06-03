using System.Text.Json;
using System.Text.Json.Serialization;

namespace HPA.SurveyFlow.Domain.DTOs.Responses;

public class NotificationRuleDto
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

    [JsonPropertyName("email_config")]
    public NotificationRuleEmailDto? EmailConfig { get; set; }

    [JsonPropertyName("sms_config")]
    public NotificationRuleSmsDto? SmsConfig { get; set; }
}

public class NotificationRuleEmailDto
{
    [JsonPropertyName("to_addresses")]
    public List<string> ToAddresses { get; set; } = [];

    [JsonPropertyName("subject")]
    public string Subject { get; set; } = string.Empty;

    [JsonPropertyName("body_html")]
    public string BodyHtml { get; set; } = string.Empty;

    [JsonPropertyName("attach_pdf")]
    public bool AttachPdf { get; set; }
}

public class NotificationRuleSmsDto
{
    [JsonPropertyName("to_numbers")]
    public List<string> ToNumbers { get; set; } = [];

    [JsonPropertyName("body")]
    public string Body { get; set; } = string.Empty;
}
