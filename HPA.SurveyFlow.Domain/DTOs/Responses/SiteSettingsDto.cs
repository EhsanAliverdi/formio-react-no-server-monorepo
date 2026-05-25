using System.Text.Json.Serialization;

namespace HPA.SurveyFlow.Domain.DTOs.Responses;

public class SiteSettingsDto
{
    [JsonPropertyName("siteName")] public string SiteName { get; set; } = "SurveyFlow";
    [JsonPropertyName("faviconUrl")] public string? FaviconUrl { get; set; }
    [JsonPropertyName("logoExpandedLightUrl")] public string? LogoExpandedLightUrl { get; set; }
    [JsonPropertyName("logoExpandedDarkUrl")] public string? LogoExpandedDarkUrl { get; set; }
    [JsonPropertyName("logoCollapsedUrl")] public string? LogoCollapsedUrl { get; set; }
    [JsonPropertyName("logoExpandedWidth")] public string? LogoExpandedWidth { get; set; }
    [JsonPropertyName("logoExpandedHeight")] public string? LogoExpandedHeight { get; set; }
    [JsonPropertyName("logoCollapsedSize")] public string? LogoCollapsedSize { get; set; }
    [JsonPropertyName("copyrightText")] public string? CopyrightText { get; set; }
    [JsonPropertyName("showCopyright")] public bool ShowCopyright { get; set; }
    [JsonPropertyName("showPublicFormLogo")] public bool ShowPublicFormLogo { get; set; }
}
