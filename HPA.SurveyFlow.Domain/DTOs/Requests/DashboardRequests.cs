using System.Text.Json.Serialization;

namespace HPA.SurveyFlow.Domain.DTOs.Requests;

public class SaveDashboardRequest
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = null!;

    [JsonPropertyName("slug")]
    public string Slug { get; set; } = null!;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("visibility")]
    public string Visibility { get; set; } = "restricted";

    [JsonPropertyName("is_active")]
    public bool IsActive { get; set; } = true;
}

public class SaveDashboardCardRequest
{
    [JsonPropertyName("report_id")]
    public int ReportId { get; set; }

    [JsonPropertyName("title_override")]
    public string? TitleOverride { get; set; }

    [JsonPropertyName("x")]
    public int X { get; set; }

    [JsonPropertyName("y")]
    public int Y { get; set; }

    [JsonPropertyName("w")]
    public int W { get; set; } = 6;

    [JsonPropertyName("h")]
    public int H { get; set; } = 4;

    [JsonPropertyName("min_w")]
    public int? MinW { get; set; }

    [JsonPropertyName("min_h")]
    public int? MinH { get; set; }

    [JsonPropertyName("max_w")]
    public int? MaxW { get; set; }

    [JsonPropertyName("max_h")]
    public int? MaxH { get; set; }

    [JsonPropertyName("settings_json")]
    public string? SettingsJson { get; set; }

    [JsonPropertyName("show_title")]
    public bool ShowTitle { get; set; } = true;

    [JsonPropertyName("fit_content")]
    public bool FitContent { get; set; } = false;

    [JsonPropertyName("custom_css")]
    public string? CustomCss { get; set; }

    /// <summary>chart | table | both</summary>
    [JsonPropertyName("display_mode")]
    public string DisplayMode { get; set; } = "chart";
}

public class SaveDashboardLayoutRequest
{
    [JsonPropertyName("cards")]
    public List<DashboardLayoutCardRequest> Cards { get; set; } = [];
}

public class DashboardLayoutCardRequest
{
    [JsonPropertyName("dashboard_card_id")]
    public int DashboardCardId { get; set; }

    [JsonPropertyName("x")]
    public int X { get; set; }

    [JsonPropertyName("y")]
    public int Y { get; set; }

    [JsonPropertyName("w")]
    public int W { get; set; }

    [JsonPropertyName("h")]
    public int H { get; set; }
}
