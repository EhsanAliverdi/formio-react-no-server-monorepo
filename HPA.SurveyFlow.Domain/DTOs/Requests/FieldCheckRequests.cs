namespace HPA.SurveyFlow.Domain.DTOs.Requests;

public sealed class FieldCheckRequest
{
    /// <summary>The formio component key being answered, e.g. "leaksVisible".</summary>
    public string FieldKey { get; set; } = null!;

    /// <summary>The value the user has just entered, e.g. "yes".</summary>
    public string FieldValue { get; set; } = null!;

    /// <summary>The triggering threshold — only flag when the answer equals this value.</summary>
    public string TriggerValue { get; set; } = null!;

    /// <summary>Lookback window in hours. Defaults to 24 if omitted.</summary>
    public int? Hours { get; set; }

    /// <summary>
    /// Optional machine/asset identifier from the form data (e.g. the value of the "machineId" field).
    /// When provided the check is scoped to submissions for that specific asset.
    /// </summary>
    public string? MachineId { get; set; }

    /// <summary>Full form data posted by formio — used to extract machineId when MachineId is not supplied directly.</summary>
    public Dictionary<string, object?>? Data { get; set; }
}
