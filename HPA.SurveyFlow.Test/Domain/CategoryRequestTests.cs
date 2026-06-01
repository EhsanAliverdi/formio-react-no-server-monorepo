using System.Text.Json;
using HPA.SurveyFlow.Domain.DTOs.Requests;

namespace HPA.SurveyFlow.Test.Domain;

public class CategoryRequestTests
{
    [Fact]
    public void UpdateCategoryRequest_DeserializesSnakeCaseDisplaySettings()
    {
        const string json = """
            {
              "name": "Updated",
              "image_url": "https://example.test/category.png",
              "show_category_image": false,
              "show_category_title": false,
              "show_category_description": false,
              "icon_key": "fa:FaTruck",
              "layout_mode": "list",
              "page_size": 24,
              "show_title": false,
              "show_description": false,
              "show_button": false,
              "button_text": "Open",
              "columns": 2,
              "card_style": "compact"
            }
            """;

        var request = JsonSerializer.Deserialize<UpdateCategoryRequest>(json);

        Assert.NotNull(request);
        Assert.Equal("Updated", request.Name);
        Assert.Equal("https://example.test/category.png", request.ImageUrl);
        Assert.False(request.ShowCategoryImage);
        Assert.False(request.ShowCategoryTitle);
        Assert.False(request.ShowCategoryDescription);
        Assert.Equal("fa:FaTruck", request.IconKey);
        Assert.Equal("list", request.LayoutMode);
        Assert.Equal(24, request.PageSize);
        Assert.False(request.ShowTitle);
        Assert.False(request.ShowDescription);
        Assert.False(request.ShowButton);
        Assert.Equal("Open", request.ButtonText);
        Assert.Equal(2, request.Columns);
        Assert.Equal("compact", request.CardStyle);
    }
}
