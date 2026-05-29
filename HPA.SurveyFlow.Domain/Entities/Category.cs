namespace HPA.SurveyFlow.Domain.Entities;

public class Category
{
    public int Id { get; set; }
    public string Slug { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public string Visibility { get; set; } = "public";
    public string? ImageUrl { get; set; }
    public string? IconKey { get; set; }
    public bool ShowTitle { get; set; } = true;
    public bool ShowDescription { get; set; } = true;
    public string? ButtonText { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
