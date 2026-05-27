namespace HPA.SurveyFlow.Domain.Entities;

public class ExternalAsset
{
    public int Id { get; set; }
    public string Source { get; set; } = null!;       // "mex" — extensible to other sources
    public string ExternalId { get; set; } = null!;   // identifier in the source system
    public string DisplayName { get; set; } = null!;  // shown in form dropdowns
    public string? Category { get; set; }
    public string? Location { get; set; }
    public string? ParentExternalId { get; set; }  // null = root node
    public bool IsActive { get; set; } = true;
    public string? RawJson { get; set; }              // full source response snapshot for audit
    public DateTime LastSyncedAt { get; set; } = DateTime.UtcNow;
    /// <summary>
    /// The source system's own last-modified timestamp (if the API provides one).
    /// Used to skip updates for records that haven't changed since the last sync.
    /// </summary>
    public DateTime? SourceModifiedAt { get; set; }
}
