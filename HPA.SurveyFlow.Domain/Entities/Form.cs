namespace HPA.SurveyFlow.Domain.Entities;

public class Form
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string Json { get; set; } = null!;
    public bool AllowAnonymousSubmit { get; set; } = true;
    public string Visibility { get; set; } = "public";
    public int? ParentFormId { get; set; }
    public string? TerminalCode { get; set; }

    public ICollection<FormSubmission> Submissions { get; set; } = [];
    public Form? ParentForm { get; set; }
    public Terminal? Terminal { get; set; }
    public ICollection<Form> ChildForms { get; set; } = [];
    public ICollection<FormAllowedRole> AllowedRoles { get; set; } = [];
    public ICollection<FormAllowedUser> AllowedUsers { get; set; } = [];
}
