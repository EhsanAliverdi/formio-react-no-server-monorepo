namespace HPA.SurveyFlow.Domain.DTOs.Requests;

public class CreateCategoryRequest
{
    public string Slug { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public string Visibility { get; set; } = "public";
    public string? ImageUrl { get; set; }
    public bool ShowCategoryImage { get; set; } = true;
    public string? IconKey { get; set; }
    public string LayoutMode { get; set; } = "card";
    public int PageSize { get; set; } = 12;
    public bool ShowTitle { get; set; } = true;
    public bool ShowDescription { get; set; } = true;
    public bool ShowButton { get; set; } = true;
    public string? ButtonText { get; set; }
    public int Columns { get; set; } = 3;
    public string CardStyle { get; set; } = "overlay";
}

public class UpdateCategoryRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? Visibility { get; set; }
    public string? ImageUrl { get; set; }
    public bool? ShowCategoryImage { get; set; }
    public string? IconKey { get; set; }
    public string? LayoutMode { get; set; }
    public int? PageSize { get; set; }
    public bool? ShowTitle { get; set; }
    public bool? ShowDescription { get; set; }
    public bool? ShowButton { get; set; }
    public string? ButtonText { get; set; }
    public int? Columns { get; set; }
    public string? CardStyle { get; set; }
}
