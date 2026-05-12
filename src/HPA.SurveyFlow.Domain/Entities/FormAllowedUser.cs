namespace HPA.SurveyFlow.Domain.Entities;

public class FormAllowedUser
{
    public int FormId { get; set; }
    public int UserId { get; set; }

    public Form Form { get; set; } = null!;
    public User User { get; set; } = null!;
}
