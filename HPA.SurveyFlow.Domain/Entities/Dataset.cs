namespace HPA.SurveyFlow.Domain.Entities;

/// <summary>
/// Optional reusable data-source abstraction that sits between a Form and one or
/// more ReportTemplates.  A Dataset pre-defines a form scope, a fixed filter set,
/// and a named set of field projections that multiple reports can share.
///
/// Reports with DatasetId set use the dataset's FormId and base filters instead of
/// their own; the direct-form path (DatasetId = null) remains fully supported.
/// </summary>
public class Dataset
{
    public int Id { get; set; }

    /// <summary>Human-readable name shown in the designer picker.</summary>
    public string Name { get; set; } = null!;

    public string? Description { get; set; }

    /// <summary>The form whose submissions this dataset queries.</summary>
    public int FormId { get; set; }

    /// <summary>Serialised ConditionGroup applied as a fixed base filter on every query.</summary>
    public string? BaseFiltersJson { get; set; }

    /// <summary>
    /// JSON array of FieldProjection objects defining the named columns this dataset exposes:
    /// [{ field_key, label, type, format? }]
    /// Reports sourcing from this dataset must use these keys for their column/groupby/measure defs.
    /// </summary>
    public string? FieldsJson { get; set; }

    public int CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public bool IsActive { get; set; } = true;

    public Form Form { get; set; } = null!;
    public User CreatedByUser { get; set; } = null!;
}
