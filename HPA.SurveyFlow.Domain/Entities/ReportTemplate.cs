namespace HPA.SurveyFlow.Domain.Entities;

public class ReportTemplate
{
    public int Id { get; set; }
    public int FormId { get; set; }
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public bool IsPublic { get; set; } = false;
    public int CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    /// <summary>Ordered JSON array of ReportColumnDefinition.</summary>
    public string ColumnsJson { get; set; } = "[]";

    /// <summary>Serialised ConditionGroup for template-level fixed filters (nullable = no filter).</summary>
    public string? FiltersJson { get; set; }

    public string? DefaultSortField { get; set; }
    public string DefaultSortDirection { get; set; } = "asc";
    public int DefaultPageSize { get; set; } = 25;

    /// <summary>Display mode: "table" (only supported mode initially).</summary>
    public string DisplayMode { get; set; } = "table";

    /// <summary>SHA-256 fingerprint of Form.Json at the time this template was last saved.</summary>
    public string? SchemaVersion { get; set; }

    public Form Form { get; set; } = null!;
    public User CreatedByUser { get; set; } = null!;
}
