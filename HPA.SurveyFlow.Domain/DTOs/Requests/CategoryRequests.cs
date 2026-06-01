using System.Text.Json.Serialization;

namespace HPA.SurveyFlow.Domain.DTOs.Requests;

public class CreateCategoryRequest
{
    [JsonPropertyName("slug")]
    public string Slug { get; set; } = null!;

    [JsonPropertyName("name")]
    public string Name { get; set; } = null!;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("visibility")]
    public string Visibility { get; set; } = "public";

    [JsonPropertyName("image_url")]
    public string? ImageUrl { get; set; }

    [JsonPropertyName("show_category_image")]
    public bool ShowCategoryImage { get; set; } = true;

    [JsonPropertyName("show_category_title")]
    public bool ShowCategoryTitle { get; set; } = true;

    [JsonPropertyName("show_category_description")]
    public bool ShowCategoryDescription { get; set; } = true;

    [JsonPropertyName("icon_key")]
    public string? IconKey { get; set; }

    [JsonPropertyName("layout_mode")]
    public string LayoutMode { get; set; } = "card";

    [JsonPropertyName("page_size")]
    public int PageSize { get; set; } = 12;

    [JsonPropertyName("show_title")]
    public bool ShowTitle { get; set; } = true;

    [JsonPropertyName("show_description")]
    public bool ShowDescription { get; set; } = true;

    [JsonPropertyName("show_button")]
    public bool ShowButton { get; set; } = true;

    [JsonPropertyName("button_text")]
    public string? ButtonText { get; set; }

    [JsonPropertyName("columns")]
    public int Columns { get; set; } = 3;

    [JsonPropertyName("card_style")]
    public string CardStyle { get; set; } = "overlay";
}

public class UpdateCategoryRequest
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("visibility")]
    public string? Visibility { get; set; }

    [JsonPropertyName("image_url")]
    public string? ImageUrl { get; set; }

    [JsonPropertyName("show_category_image")]
    public bool? ShowCategoryImage { get; set; }

    [JsonPropertyName("show_category_title")]
    public bool? ShowCategoryTitle { get; set; }

    [JsonPropertyName("show_category_description")]
    public bool? ShowCategoryDescription { get; set; }

    [JsonPropertyName("icon_key")]
    public string? IconKey { get; set; }

    [JsonPropertyName("layout_mode")]
    public string? LayoutMode { get; set; }

    [JsonPropertyName("page_size")]
    public int? PageSize { get; set; }

    [JsonPropertyName("show_title")]
    public bool? ShowTitle { get; set; }

    [JsonPropertyName("show_description")]
    public bool? ShowDescription { get; set; }

    [JsonPropertyName("show_button")]
    public bool? ShowButton { get; set; }

    [JsonPropertyName("button_text")]
    public string? ButtonText { get; set; }

    [JsonPropertyName("columns")]
    public int? Columns { get; set; }

    [JsonPropertyName("card_style")]
    public string? CardStyle { get; set; }
}
