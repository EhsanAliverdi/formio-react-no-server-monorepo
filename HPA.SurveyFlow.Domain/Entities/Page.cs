namespace HPA.SurveyFlow.Domain.Entities;

public class Page
{
    public int Id { get; set; }
    public string Title { get; set; } = null!;
    public string Slug { get; set; } = null!;
    public string? Description { get; set; }
    public string Visibility { get; set; } = "public";
    public bool IsActive { get; set; } = true;
    public bool UseLayout { get; set; } = true;
    public string? TerminalCode { get; set; }
    public string ProjectJson { get; set; } = "{}";
    public string Html { get; set; } = string.Empty;
    public string Css { get; set; } = string.Empty;
    public int CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User CreatedByUser { get; set; } = null!;
    public Terminal? Terminal { get; set; }
}
