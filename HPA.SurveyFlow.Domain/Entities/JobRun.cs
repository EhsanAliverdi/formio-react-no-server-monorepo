namespace HPA.SurveyFlow.Domain.Entities;

public class JobRun
{
    public int Id { get; set; }
    public string JobKey { get; set; } = null!;
    public string DisplayName { get; set; } = null!;
    public string TriggerType { get; set; } = null!;     // "scheduled" | "manual"
    public string? TriggeredByEmail { get; set; }
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    public string Status { get; set; } = null!;          // "running" | "success" | "failed"
    public string? ErrorMessage { get; set; }
    public string? ResultSummary { get; set; }           // JSON blob e.g. {"assetsUpserted":42}
}
