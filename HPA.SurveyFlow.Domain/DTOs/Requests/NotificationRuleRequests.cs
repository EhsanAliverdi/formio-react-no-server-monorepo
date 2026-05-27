using System.Text.Json.Serialization;

namespace HPA.SurveyFlow.Domain.DTOs.Requests;

public class SaveNotificationRuleRequest
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = null!;

    [JsonPropertyName("enabled")]
    public bool Enabled { get; set; } = true;

    [JsonPropertyName("channel")]
    public string Channel { get; set; } = "email";

    [JsonPropertyName("condition_group")]
    public object ConditionGroup { get; set; } = null!; // raw JSON passed through

    [JsonPropertyName("sort_order")]
    public int SortOrder { get; set; } = 0;

    [JsonPropertyName("email_config")]
    public SaveNotificationRuleEmailRequest? EmailConfig { get; set; }
}

public class SaveNotificationRuleEmailRequest
{
    [JsonPropertyName("to_addresses")]
    public List<string> ToAddresses { get; set; } = [];

    [JsonPropertyName("subject")]
    public string Subject { get; set; } = string.Empty;

    [JsonPropertyName("body_html")]
    public string BodyHtml { get; set; } = string.Empty;

    [JsonPropertyName("attach_pdf")]
    public bool AttachPdf { get; set; } = false;
}
