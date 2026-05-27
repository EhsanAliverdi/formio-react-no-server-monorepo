namespace HPA.SurveyFlow.Domain.Entities;

public class FormIntegrationRuleWebhook
{
    public int Id { get; set; }
    public int RuleId { get; set; }

    public string Url { get; set; } = string.Empty;
    public string Method { get; set; } = "POST"; // GET | POST | PUT | PATCH

    /// <summary>JSON: [{name, value}]</summary>
    public string HeadersJson { get; set; } = "[]";

    /// <summary>Body template supporting {{placeholders}}. Empty = no body sent.</summary>
    public string BodyTemplate { get; set; } = string.Empty;

    public FormIntegrationRule Rule { get; set; } = null!;
}
