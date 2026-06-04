using System.Text.Json;
using System.Text.Json.Serialization;

namespace HPA.SurveyFlow.Domain.DTOs.Responses;

public class DashboardDto
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = null!;

    [JsonPropertyName("slug")]
    public string Slug { get; set; } = null!;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("visibility")]
    public string Visibility { get; set; } = "restricted";

    [JsonPropertyName("is_active")]
    public bool IsActive { get; set; }

    [JsonPropertyName("terminal_code")]
    public string? TerminalCode { get; set; }

    [JsonPropertyName("created_by_user_id")]
    public int CreatedByUserId { get; set; }

    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updated_at")]
    public DateTime UpdatedAt { get; set; }

    [JsonPropertyName("cards")]
    public List<DashboardCardDto> Cards { get; set; } = [];
}

public class DashboardCardDto
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("dashboard_id")]
    public int DashboardId { get; set; }

    [JsonPropertyName("report_id")]
    public int ReportId { get; set; }

    [JsonPropertyName("report_name")]
    public string ReportName { get; set; } = null!;

    [JsonPropertyName("report_chart_type")]
    public string ReportChartType { get; set; } = "table";

    [JsonPropertyName("report_chart_config")]
    public JsonElement? ReportChartConfig { get; set; }

    [JsonPropertyName("title_override")]
    public string? TitleOverride { get; set; }

    [JsonPropertyName("x")]
    public int X { get; set; }

    [JsonPropertyName("y")]
    public int Y { get; set; }

    [JsonPropertyName("w")]
    public int W { get; set; }

    [JsonPropertyName("h")]
    public int H { get; set; }

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
