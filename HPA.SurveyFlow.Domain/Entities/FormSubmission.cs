namespace HPA.SurveyFlow.Domain.Entities;

public class FormSubmission
{
    public int Id { get; set; }
    public int FormId { get; set; }
    public int? UserId { get; set; }
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
    public string Data { get; set; } = null!;
    public DateTime? UpdatedAt { get; set; }
    public int? UpdatedBy { get; set; }
    public string? EditHistory { get; set; }

    // secondary submit tracking
    public string? SecondarySubmitStatus { get; set; }    // null | "pending" | "success" | "failed"
    public string? SecondarySubmitResponse { get; set; }  // raw JSON response from the integration
    public DateTime? SecondarySubmitAt { get; set; }

    public Form Form { get; set; } = null!;
    public User? User { get; set; }
}
