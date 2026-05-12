using System.Text.Json.Serialization;

namespace HPA.SurveyFlow.Domain.DTOs.Requests;

public class CreateNotificationRequest
{
    [JsonPropertyName("title")] public string? Title { get; set; }
    [JsonPropertyName("body")] public string? Body { get; set; }
    [JsonPropertyName("level")] public string? Level { get; set; }
    [JsonPropertyName("all_users")] public bool? AllUsers { get; set; }
    [JsonPropertyName("roles")] public List<string>? Roles { get; set; }
    [JsonPropertyName("user_ids")] public List<int>? UserIds { get; set; }
}

public class PdfExportRequest
{
    [JsonPropertyName("html")] public string? Html { get; set; }
    [JsonPropertyName("fileName")] public string? FileName { get; set; }
}

public class UpdateSubmissionRequest
{
    [JsonPropertyName("data")] public System.Text.Json.JsonElement? Data { get; set; }
}

public class UpdateSiteSettingsRequest
{
    [JsonPropertyName("siteName")] public string? SiteName { get; set; }
    [JsonPropertyName("faviconUrl")] public string? FaviconUrl { get; set; }
    [JsonPropertyName("logoExpandedLightUrl")] public string? LogoExpandedLightUrl { get; set; }
    [JsonPropertyName("logoExpandedDarkUrl")] public string? LogoExpandedDarkUrl { get; set; }
    [JsonPropertyName("logoCollapsedUrl")] public string? LogoCollapsedUrl { get; set; }
    [JsonPropertyName("logoExpandedWidth")] public string? LogoExpandedWidth { get; set; }
    [JsonPropertyName("logoExpandedHeight")] public string? LogoExpandedHeight { get; set; }
    [JsonPropertyName("logoCollapsedSize")] public string? LogoCollapsedSize { get; set; }
}
