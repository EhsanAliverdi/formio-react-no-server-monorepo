using System.Text.Json.Serialization;

namespace HPA.SurveyFlow.Domain.DTOs.Responses;

public class IntegrationsDto
{
    [JsonPropertyName("email")] public EmailIntegrationDto Email { get; set; } = new();
    [JsonPropertyName("mex")] public MexIntegrationDto Mex { get; set; } = new();
    [JsonPropertyName("sms")] public SmsIntegrationDto Sms { get; set; } = new();
}

public class EmailIntegrationDto
{
    [JsonPropertyName("enabled")] public bool Enabled { get; set; }
    [JsonPropertyName("provider")] public string Provider { get; set; } = "smtp";
    [JsonPropertyName("smtpHost")] public string? SmtpHost { get; set; }
    [JsonPropertyName("smtpPort")] public string? SmtpPort { get; set; }
    [JsonPropertyName("smtpUsername")] public string? SmtpUsername { get; set; }
    // Password is never returned to client
    [JsonPropertyName("smtpPasswordSet")] public bool SmtpPasswordSet { get; set; }
    [JsonPropertyName("smtpTls")] public bool SmtpTls { get; set; } = true;
    [JsonPropertyName("sendgridApiKeySet")] public bool SendgridApiKeySet { get; set; }
    [JsonPropertyName("fromEmail")] public string? FromEmail { get; set; }
    [JsonPropertyName("fromName")] public string? FromName { get; set; }
}

public class MexIntegrationDto
{
    [JsonPropertyName("enabled")] public bool Enabled { get; set; }
    [JsonPropertyName("baseUrl")] public string? BaseUrl { get; set; }
    // API key is never returned to client
    [JsonPropertyName("apiKeySet")] public bool ApiKeySet { get; set; }
}

public class SmsIntegrationDto
{
    [JsonPropertyName("enabled")] public bool Enabled { get; set; }
    [JsonPropertyName("provider")] public string Provider { get; set; } = "messagemedia";
    [JsonPropertyName("messageMediaApiKeySet")] public bool MessageMediaApiKeySet { get; set; }
    [JsonPropertyName("messageMediaApiSecretSet")] public bool MessageMediaApiSecretSet { get; set; }
    [JsonPropertyName("sourceNumber")] public string? SourceNumber { get; set; }
    [JsonPropertyName("sourceNumberType")] public string? SourceNumberType { get; set; }
    [JsonPropertyName("callbackUrl")] public string? CallbackUrl { get; set; }
    [JsonPropertyName("deliveryReport")] public bool DeliveryReport { get; set; }
}
