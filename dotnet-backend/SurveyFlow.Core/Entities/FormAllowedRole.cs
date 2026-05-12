namespace SurveyFlow.Core.Entities;

public class FormAllowedRole
{
    public int FormId { get; set; }
    public string Role { get; set; } = null!;

    public Form Form { get; set; } = null!;
}
