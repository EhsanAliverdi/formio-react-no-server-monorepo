namespace HPA.SurveyFlow.Domain.Entities;

/// <summary>
/// Append-only audit log of every report execution.
/// Powers "Recently Used" per-user ring buffer and future usage analytics.
/// </summary>
public class ReportExecutionLog
{
    public int Id { get; set; }
    public int ReportTemplateId { get; set; }

    /// <summary>Null for anonymous/unauthenticated executions.</summary>
    public int? UserId { get; set; }

    public DateTime ExecutedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Milliseconds the query took on the server.</summary>
    public int DurationMs { get; set; }

    /// <summary>Total rows returned (after filters).</summary>
    public int RowCount { get; set; }

    /// <summary>export_csv | export_excel | view — how the user consumed the result.</summary>
    public string ExecutionType { get; set; } = "view";

    public ReportTemplate ReportTemplate { get; set; } = null!;
    public User? User { get; set; }
}
