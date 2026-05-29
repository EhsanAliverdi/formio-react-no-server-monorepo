namespace HPA.SurveyFlow.Domain.Entities;

/// <summary>Tamper-evident record of every significant change in the system.</summary>
public class AuditLog
{
    public long Id { get; set; }

    /// <summary>Null for system-initiated actions (e.g. scheduled jobs).</summary>
    public int? ActorId { get; set; }
    public string ActorEmail { get; set; } = "system";

    /// <summary>created | updated | deleted | restored | login | logout</summary>
    public string Action { get; set; } = null!;

    /// <summary>Form | Submission | User | ReportTemplate | Rule | ApiKey | …</summary>
    public string EntityType { get; set; } = null!;
    public string EntityId { get; set; } = null!;
    public string? EntityName { get; set; }

    /// <summary>JSON object with before/after snapshots of changed fields.</summary>
    public string? ChangesJson { get; set; }

    public string? IpAddress { get; set; }
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;

    public User? Actor { get; set; }
}
