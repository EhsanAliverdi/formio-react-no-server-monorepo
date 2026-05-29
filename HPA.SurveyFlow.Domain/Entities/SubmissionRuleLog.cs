namespace HPA.SurveyFlow.Domain.Entities;

public class SubmissionRuleLog
{
    public int Id { get; set; }
    public int SubmissionId { get; set; }
    public int? RuleId { get; set; }         // null for legacy appSettings secondarySubmit
    public string RuleName { get; set; } = null!;
    public string RuleType { get; set; } = null!;   // "integration" | "notification"
    public string Channel { get; set; } = null!;    // "mex" | "webhook" | "email"
    public string? Action { get; set; }              // "create_request", "POST https://…", null for email
    public string Status { get; set; } = null!;     // "pending" | "success" | "failed"
    public string? RequestJson { get; set; }
    public string? ResponseJson { get; set; }
    public int? StatusCode { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime TriggeredAt { get; set; }
    public DateTime? CompletedAt { get; set; }

    public FormSubmission Submission { get; set; } = null!;
}
