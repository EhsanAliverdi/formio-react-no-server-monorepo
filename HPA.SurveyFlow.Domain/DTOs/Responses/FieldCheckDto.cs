namespace HPA.SurveyFlow.Domain.DTOs.Responses;

public sealed class FieldCheckResultDto
{
    /// <summary>False when prior reports exist and the user should be warned.</summary>
    public bool Valid { get; set; } = true;

    /// <summary>True when at least one matching prior submission was found in the window.</summary>
    public bool AlreadyReported { get; set; }

    /// <summary>Human-readable name of the asset scoped by the check, if resolved.</summary>
    public string? MachineName { get; set; }

    /// <summary>Aggregate counts and timestamps for matching submissions.</summary>
    public FieldCheckSummaryDto? Summary { get; set; }

    /// <summary>
    /// What actually happened to prior reports — integrations and notifications that fired.
    /// Only includes successful rule log entries.
    /// </summary>
    public List<FieldCheckActionDto> ActionsTaken { get; set; } = [];

    /// <summary>Ready-to-display message formio renders under the component.</summary>
    public string? Message { get; set; }
}

public sealed class FieldCheckSummaryDto
{
    public int ReportCount { get; set; }
    public DateTime FirstReportedAt { get; set; }
    public DateTime LastReportedAt { get; set; }
}

public sealed class FieldCheckActionDto
{
    /// <summary>"integration" or "notification"</summary>
    public string Type { get; set; } = null!;

    /// <summary>"mex" | "webhook" | "email"</summary>
    public string Channel { get; set; } = null!;

    /// <summary>Human-readable label derived from RuleName.</summary>
    public string Label { get; set; } = null!;

    /// <summary>MEX work order number or similar external reference, if available.</summary>
    public string? Reference { get; set; }

    public DateTime TriggeredAt { get; set; }
}
