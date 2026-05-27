namespace HPA.SurveyFlow.Domain.Entities;

public class FormIntegrationRuleMex
{
    public int Id { get; set; }
    public int RuleId { get; set; }

    /// <summary>e.g. "create_request"</summary>
    public string Action { get; set; } = "create_request";

    /// <summary>Form field key whose value is used as MEX contactId. Null = default 1.</summary>
    public string? ContactIdField { get; set; }

    /// <summary>Form field key whose value is used as MEX jobTypeName. Null = fetch first active.</summary>
    public string? JobTypeField { get; set; }

    /// <summary>JSON: Record&lt;mexField, {source, fieldKey?, value?, template?}&gt;</summary>
    public string FieldMappingsJson { get; set; } = "{}";

    public FormIntegrationRule Rule { get; set; } = null!;
}
