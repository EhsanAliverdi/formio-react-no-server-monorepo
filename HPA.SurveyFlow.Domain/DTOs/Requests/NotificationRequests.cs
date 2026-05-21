using System.Text.Json.Serialization;

namespace HPA.SurveyFlow.Domain.DTOs.Requests;

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

public class UpdateIntegrationsRequest
{
    [JsonPropertyName("email")] public EmailIntegrationRequest? Email { get; set; }
    [JsonPropertyName("mex")] public MexIntegrationRequest? Mex { get; set; }
}

public class EmailIntegrationRequest
{
    [JsonPropertyName("provider")] public string? Provider { get; set; }
    [JsonPropertyName("smtpHost")] public string? SmtpHost { get; set; }
    [JsonPropertyName("smtpPort")] public string? SmtpPort { get; set; }
    [JsonPropertyName("smtpUsername")] public string? SmtpUsername { get; set; }
    [JsonPropertyName("smtpPassword")] public string? SmtpPassword { get; set; }
    [JsonPropertyName("smtpTls")] public string? SmtpTls { get; set; }
    [JsonPropertyName("sendgridApiKey")] public string? SendgridApiKey { get; set; }
    [JsonPropertyName("fromEmail")] public string? FromEmail { get; set; }
    [JsonPropertyName("fromName")] public string? FromName { get; set; }
    [JsonPropertyName("enabled")] public string? Enabled { get; set; }
}

public class MexIntegrationRequest
{
    [JsonPropertyName("baseUrl")] public string? BaseUrl { get; set; }
    [JsonPropertyName("apiKey")] public string? ApiKey { get; set; }
    [JsonPropertyName("enabled")] public string? Enabled { get; set; }
}

public class TestEmailRequest
{
    [JsonPropertyName("toEmail")] public string? ToEmail { get; set; }
    [JsonPropertyName("provider")] public string? Provider { get; set; }
    [JsonPropertyName("smtpHost")] public string? SmtpHost { get; set; }
    [JsonPropertyName("smtpPort")] public string? SmtpPort { get; set; }
    [JsonPropertyName("smtpUsername")] public string? SmtpUsername { get; set; }
    [JsonPropertyName("smtpPassword")] public string? SmtpPassword { get; set; }
    [JsonPropertyName("smtpTls")] public string? SmtpTls { get; set; }
    [JsonPropertyName("sendgridApiKey")] public string? SendgridApiKey { get; set; }
    [JsonPropertyName("fromEmail")] public string? FromEmail { get; set; }
    [JsonPropertyName("fromName")] public string? FromName { get; set; }
}

public class TestMexRequest
{
    [JsonPropertyName("baseUrl")] public string? BaseUrl { get; set; }
    [JsonPropertyName("apiKey")] public string? ApiKey { get; set; }
    [JsonPropertyName("confirmedProduction")] public bool? ConfirmedProduction { get; set; }
}
