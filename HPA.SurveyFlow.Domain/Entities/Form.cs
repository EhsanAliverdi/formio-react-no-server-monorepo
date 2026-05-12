namespace HPA.SurveyFlow.Domain.Entities;

public class Form
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string Json { get; set; } = null!;
    public bool AllowAnonymousSubmit { get; set; } = true;
    public string Visibility { get; set; } = "public";

    public ICollection<FormSubmission> Submissions { get; set; } = [];
    public ICollection<FormAllowedRole> AllowedRoles { get; set; } = [];
    public ICollection<FormAllowedUser> AllowedUsers { get; set; } = [];
}
