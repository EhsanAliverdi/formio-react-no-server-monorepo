namespace HPA.SurveyFlow.Domain.Entities;

public class FormNotificationRuleEmail
{
    public int Id { get; set; }
    public int RuleId { get; set; }
    public string ToAddressesJson { get; set; } = "[]"; // JSON array of email strings
    public string Subject { get; set; } = string.Empty;
    public string BodyHtml { get; set; } = string.Empty;
    public bool AttachPdf { get; set; } = false;

    public FormNotificationRule Rule { get; set; } = null!;
}
