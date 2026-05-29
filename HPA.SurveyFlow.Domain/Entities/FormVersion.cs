namespace HPA.SurveyFlow.Domain.Entities;

/// <summary>Immutable snapshot of a Form's JSON at a point in time.</summary>
public class FormVersion
{
    public int Id { get; set; }
    public int FormId { get; set; }

    /// <summary>Monotonically increasing per-form counter (1, 2, 3, …).</summary>
    public int VersionNumber { get; set; }

    public string JsonSnapshot { get; set; } = null!;

    /// <summary>Optional free-text description of what changed in this version.</summary>
    public string? ChangeSummary { get; set; }

    public int CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Form Form { get; set; } = null!;
    public User CreatedByUser { get; set; } = null!;
}
