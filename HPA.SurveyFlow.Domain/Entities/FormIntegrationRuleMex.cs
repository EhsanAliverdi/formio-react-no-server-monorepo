namespace HPA.SurveyFlow.Domain.Entities;

public class FormIntegrationRuleMex
{
    public int Id { get; set; }
    public int RuleId { get; set; }

    /// <summary>e.g. "create_request"</summary>
    public string Action { get; set; } = "create_request";

    /// <summary>JSON: Record&lt;mexField, {source, fieldKey?, value?, template?}&gt;</summary>
    public string FieldMappingsJson { get; set; } = "{}";

    public FormIntegrationRule Rule { get; set; } = null!;
}
