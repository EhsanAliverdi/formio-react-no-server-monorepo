namespace HPA.SurveyFlow.Domain.Entities;

public class User
{
    public int Id { get; set; }
    public string Email { get; set; } = null!;
    public string PasswordHash { get; set; } = null!;
    public string Role { get; set; } = "admin";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public string? DisplayName { get; set; }
    public string? PreferredName { get; set; }
    public string? FirstName { get; set; }
    public string? MiddleName { get; set; }
    public string? LastName { get; set; }
    public string? Pronouns { get; set; }
    public string? DateOfBirth { get; set; }
    public string? Phone { get; set; }
    public string? JobTitle { get; set; }
    public string? Department { get; set; }
    public string? Company { get; set; }
    public string? WebsiteUrl { get; set; }
    public string? Bio { get; set; }
    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? PostalCode { get; set; }
    public string? Country { get; set; }
    public string? Timezone { get; set; }
    public string? Locale { get; set; }
    public string? AvatarUrl { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<Session> Sessions { get; set; } = [];
    public ICollection<FormSubmission> Submissions { get; set; } = [];
    public ICollection<FormAllowedUser> AllowedForms { get; set; } = [];
}
