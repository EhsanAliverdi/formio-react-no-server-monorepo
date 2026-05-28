namespace HPA.SurveyFlow.Domain.Entities;

/// <summary>
/// Row-level security policy attached to a report template.
/// At query time the engine appends the WHERE clause fragment, injecting any
/// system variables (e.g. {{CurrentUser}}) before execution.
/// Admin role always bypasses all policies (fail-open for admins, fail-closed for others).
/// </summary>
public class RlsPolicy
{
    public int Id { get; set; }
    public int ReportTemplateId { get; set; }

    /// <summary>Human-readable name for the policy (shown in the designer).</summary>
    public string Name { get; set; } = null!;

    /// <summary>
    /// Raw SQL fragment appended with AND to the WHERE clause.
    /// Supports system variables: {{CurrentUser}}, {{CurrentUserRole}}, {{Today}}.
    /// Example: "data::jsonb->>'operatorEmail' = '{{CurrentUser}}'"
    /// </summary>
    public string WhereFragment { get; set; } = null!;

    /// <summary>Comma-separated roles this policy applies to. Empty = all non-admin roles.</summary>
    public string? AppliestoRoles { get; set; }

    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ReportTemplate ReportTemplate { get; set; } = null!;
}
