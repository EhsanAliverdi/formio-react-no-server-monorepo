namespace HPA.SurveyFlow.Domain.Entities;

public class Category
{
    public int Id { get; set; }
    public string Slug { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public string Visibility { get; set; } = "public";

    // Category-level image / icon (shown as the category header image, not per-form card image)
    public string? ImageUrl { get; set; }
    public bool ShowCategoryImage { get; set; } = true;
    public bool ShowCategoryTitle { get; set; } = true;
    public bool ShowCategoryDescription { get; set; } = true;
    public string? IconKey { get; set; }

    // Layout
    public string LayoutMode { get; set; } = "card";   // "card" | "list"
    public int PageSize { get; set; } = 12;             // items per page, both views

    // Card-view-only display settings
    public bool ShowTitle { get; set; } = true;
    public bool ShowDescription { get; set; } = true;
    public bool ShowButton { get; set; } = true;
    public string? ButtonText { get; set; }
    public int Columns { get; set; } = 3;               // 1–4
    public string CardStyle { get; set; } = "overlay";  // "overlay" | "compact"

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
