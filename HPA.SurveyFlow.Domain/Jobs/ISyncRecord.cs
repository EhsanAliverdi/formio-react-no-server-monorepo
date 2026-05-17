namespace HPA.SurveyFlow.Domain.Jobs;

/// <summary>
/// Represents one record fetched from an external integration.
/// Implement this for every entity type a sync job produces.
/// The framework uses ExternalId for upsert matching and SourceModifiedAt for change detection.
/// </summary>
public interface ISyncRecord
{
    /// <summary>The unique identifier in the source system.</summary>
    string ExternalId { get; }

    /// <summary>
    /// The timestamp when the source record was last modified.
    /// Null if the API does not provide this field.
    /// Used by the framework when OnlyUpdateChanged is enabled.
    /// </summary>
    DateTime? SourceModifiedAt { get; }
}
