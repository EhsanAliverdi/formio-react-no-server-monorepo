namespace SurveyFlow.Core.Entities;

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

    public Form Form { get; set; } = null!;
    public User? User { get; set; }
}
