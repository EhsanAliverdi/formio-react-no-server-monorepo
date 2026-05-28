namespace HPA.SurveyFlow.Domain.Entities;

public class FormIntegrationRule
{
    public int Id { get; set; }
    public int FormId { get; set; }
    public string Name { get; set; } = null!;
    public bool Enabled { get; set; } = true;
    public string Channel { get; set; } = "mex"; // "mex" | "webhook"
    public string ConditionGroupJson { get; set; } = null!;
    public int SortOrder { get; set; } = 0;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Form Form { get; set; } = null!;
    public FormIntegrationRuleMex? MexConfig { get; set; }
    public FormIntegrationRuleWebhook? WebhookConfig { get; set; }
}
