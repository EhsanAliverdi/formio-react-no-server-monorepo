namespace HPA.SurveyFlow.Domain.Entities;

public class FormNotificationRuleSms
{
    public int Id { get; set; }
    public int RuleId { get; set; }
    public string ToNumbersJson { get; set; } = "[]";
    public string Body { get; set; } = string.Empty;

    public FormNotificationRule Rule { get; set; } = null!;
}
