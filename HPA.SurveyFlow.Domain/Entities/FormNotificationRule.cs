namespace HPA.SurveyFlow.Domain.Entities;

public class FormNotificationRule
{
    public int Id { get; set; }
    public int FormId { get; set; }
    public string Name { get; set; } = null!;
    public bool Enabled { get; set; } = true;
    public string Channel { get; set; } = "email"; // "email" | future: "sms" | "webhook"
    public string ConditionGroupJson { get; set; } = null!; // serialised NotificationConditionGroup
    public int SortOrder { get; set; } = 0;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Form Form { get; set; } = null!;
    public FormNotificationRuleEmail? EmailConfig { get; set; }
}
