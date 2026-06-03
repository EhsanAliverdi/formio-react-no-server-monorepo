using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using HPA.SurveyFlow.Api.Authorization;
using HPA.SurveyFlow.Domain.DTOs.Requests;
using HPA.SurveyFlow.Domain.DTOs.Responses;
using HPA.SurveyFlow.Domain.Entities;
using HPA.SurveyFlow.Domain.Security;
using HPA.SurveyFlow.Infrastructure.Data;
using HPA.SurveyFlow.Infrastructure.Sms;

namespace HPA.SurveyFlow.Api.Controllers;

[ApiController]
[Route("api/integrations")]
public class IntegrationsController(AppDbContext db, ILogger<IntegrationsController> logger) : ControllerBase
{
    [RequirePermission(Permissions.Admin.ManageSettings)]
    [HttpGet]
    public async Task<IActionResult> GetIntegrations()
    {
        var settings = await db.SiteSettings.ToListAsync();
        return Ok(BuildIntegrationsDto(settings));
    }

    [RequirePermission(Permissions.Admin.ManageSettings)]
    [HttpPut]
    public async Task<IActionResult> UpdateIntegrations([FromBody] UpdateIntegrationsRequest body)
    {
        var updates = new Dictionary<string, string?>();

        if (body.Email != null)
        {
            if (body.Email.Enabled != null) updates["integration.email.enabled"] = body.Email.Enabled;
            if (body.Email.Provider != null) updates["integration.email.provider"] = body.Email.Provider;
            if (body.Email.SmtpHost != null) updates["integration.email.smtpHost"] = body.Email.SmtpHost;
            if (body.Email.SmtpPort != null) updates["integration.email.smtpPort"] = body.Email.SmtpPort;
            if (body.Email.SmtpUsername != null) updates["integration.email.smtpUsername"] = body.Email.SmtpUsername;
            if (body.Email.SmtpPassword != null) updates["integration.email.smtpPassword"] = body.Email.SmtpPassword;
            if (body.Email.SmtpTls != null) updates["integration.email.smtpTls"] = body.Email.SmtpTls;
            if (body.Email.SendgridApiKey != null) updates["integration.email.sendgridApiKey"] = body.Email.SendgridApiKey;
            if (body.Email.FromEmail != null) updates["integration.email.fromEmail"] = body.Email.FromEmail;
            if (body.Email.FromName != null) updates["integration.email.fromName"] = body.Email.FromName;
        }

        if (body.Mex != null)
        {
            if (body.Mex.Enabled != null) updates["integration.mex.enabled"] = body.Mex.Enabled;
            if (body.Mex.BaseUrl != null) updates["integration.mex.baseUrl"] = body.Mex.BaseUrl;
            if (body.Mex.ApiKey != null) updates["integration.mex.apiKey"] = body.Mex.ApiKey;
        }

        if (body.Sms != null)
        {
            if (body.Sms.Enabled != null) updates["integration.sms.enabled"] = body.Sms.Enabled;
            if (body.Sms.Provider != null) updates["integration.sms.provider"] = body.Sms.Provider;
            if (body.Sms.MessageMediaApiKey != null) updates["integration.sms.messageMediaApiKey"] = body.Sms.MessageMediaApiKey;
            if (body.Sms.MessageMediaApiSecret != null) updates["integration.sms.messageMediaApiSecret"] = body.Sms.MessageMediaApiSecret;
            if (body.Sms.SourceNumber != null) updates["integration.sms.sourceNumber"] = body.Sms.SourceNumber;
            if (body.Sms.SourceNumberType != null) updates["integration.sms.sourceNumberType"] = body.Sms.SourceNumberType;
            if (body.Sms.CallbackUrl != null) updates["integration.sms.callbackUrl"] = body.Sms.CallbackUrl;
            if (body.Sms.DeliveryReport != null) updates["integration.sms.deliveryReport"] = body.Sms.DeliveryReport;
        }

        foreach (var (key, value) in updates)
        {
            if (value == null) continue;
            var existing = await db.SiteSettings.FindAsync(key);
            if (existing != null)
                existing.Value = value;
            else
                db.SiteSettings.Add(new SiteSetting { Key = key, Value = value });
        }

        await db.SaveChangesAsync();

        var allSettings = await db.SiteSettings.ToListAsync();
        return Ok(BuildIntegrationsDto(allSettings));
    }

    [RequirePermission(Permissions.Admin.ManageSettings)]
    [HttpPost("email/test")]
    public async Task<IActionResult> TestEmailIntegration([FromBody] TestEmailRequest body)
    {
        var settings = (await db.SiteSettings.ToListAsync()).ToDictionary(s => s.Key, s => s.Value);

        var provider = body.Provider ?? settings.GetValueOrDefault("integration.email.provider") ?? "smtp";
        var fromEmail = body.FromEmail ?? settings.GetValueOrDefault("integration.email.fromEmail") ?? "noreply@surveyflow.local";
        var fromName = body.FromName ?? settings.GetValueOrDefault("integration.email.fromName") ?? "SurveyFlow";
        var toEmail = body.ToEmail;

        if (string.IsNullOrWhiteSpace(toEmail))
            return BadRequest(new { error = "Recipient email (toEmail) is required." });

        try
        {
            if (provider == "sendgrid")
            {
                var apiKey = body.SendgridApiKey ?? settings.GetValueOrDefault("integration.email.sendgridApiKey");
                if (string.IsNullOrWhiteSpace(apiKey))
                    return BadRequest(new { error = "SendGrid API key is not configured." });

                using var http = new HttpClient();
                http.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);
                var payload = new
                {
                    personalizations = new[] { new { to = new[] { new { email = toEmail } } } },
                    from = new { email = fromEmail, name = fromName },
                    subject = "SurveyFlow - Email integration test",
                    content = new[] { new { type = "text/plain", value = "This is a test email from SurveyFlow. Your email integration is working correctly." } }
                };
                var response = await http.PostAsJsonAsync("https://api.sendgrid.com/v3/mail/send", payload);
                if (!response.IsSuccessStatusCode)
                {
                    var detail = await response.Content.ReadAsStringAsync();
                    return BadRequest(new { error = $"SendGrid returned {(int)response.StatusCode}: {detail}" });
                }
            }
            else
            {
                var host = body.SmtpHost ?? settings.GetValueOrDefault("integration.email.smtpHost");
                var portStr = body.SmtpPort ?? settings.GetValueOrDefault("integration.email.smtpPort") ?? "587";
                var username = body.SmtpUsername ?? settings.GetValueOrDefault("integration.email.smtpUsername");
                var password = body.SmtpPassword ?? settings.GetValueOrDefault("integration.email.smtpPassword");
                var tlsStr = body.SmtpTls ?? settings.GetValueOrDefault("integration.email.smtpTls") ?? "true";

                if (string.IsNullOrWhiteSpace(host))
                    return BadRequest(new { error = "SMTP host is not configured." });

                if (!int.TryParse(portStr, out var port)) port = 587;
                var tls = tlsStr != "false";

                using var client = new System.Net.Mail.SmtpClient(host, port)
                {
                    EnableSsl = tls,
                    DeliveryMethod = System.Net.Mail.SmtpDeliveryMethod.Network,
                    UseDefaultCredentials = false,
                };

                if (!string.IsNullOrWhiteSpace(username) && !string.IsNullOrWhiteSpace(password))
                    client.Credentials = new System.Net.NetworkCredential(username, password);

                var message = new System.Net.Mail.MailMessage(
                    new System.Net.Mail.MailAddress(fromEmail, fromName),
                    new System.Net.Mail.MailAddress(toEmail))
                {
                    Subject = "SurveyFlow - Email integration test",
                    Body = "This is a test email from SurveyFlow. Your email integration is working correctly.",
                };

                await client.SendMailAsync(message);
            }

            return Ok(new { success = true, message = $"Test email sent to {toEmail}." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [RequirePermission(Permissions.Admin.ManageSettings)]
    [HttpPost("sms/test")]
    public async Task<IActionResult> TestSmsIntegration([FromBody] TestSmsRequest body)
    {
        var settings = (await db.SiteSettings.ToListAsync()).ToDictionary(s => s.Key, s => (string?)s.Value);
        settings["integration.sms.enabled"] = "true";
        settings["integration.sms.provider"] = body.Provider ?? settings.GetValueOrDefault("integration.sms.provider") ?? "messagemedia";
        if (!string.IsNullOrWhiteSpace(body.MessageMediaApiKey))
            settings["integration.sms.messageMediaApiKey"] = body.MessageMediaApiKey;
        if (!string.IsNullOrWhiteSpace(body.MessageMediaApiSecret))
            settings["integration.sms.messageMediaApiSecret"] = body.MessageMediaApiSecret;
        if (body.SourceNumber != null)
            settings["integration.sms.sourceNumber"] = body.SourceNumber;
        if (body.SourceNumberType != null)
            settings["integration.sms.sourceNumberType"] = body.SourceNumberType;
        if (body.CallbackUrl != null)
            settings["integration.sms.callbackUrl"] = body.CallbackUrl;
        if (body.DeliveryReport != null)
            settings["integration.sms.deliveryReport"] = body.DeliveryReport;

        if (string.IsNullOrWhiteSpace(body.ToNumber))
            return BadRequest(new { error = "Recipient phone number (toNumber) is required." });

        var sender = SmsSenderFactory.Create(settings, logger);
        if (sender == null)
            return BadRequest(new { error = "MessageMedia SMS integration is disabled or missing API credentials." });

        try
        {
            var message = string.IsNullOrWhiteSpace(body.Message)
                ? "This is a test SMS from SurveyFlow. Your MessageMedia integration is working correctly."
                : body.Message;
            var result = await sender.SendAsync(new HPA.SurveyFlow.Domain.Sms.SmsMessage
            {
                To = [body.ToNumber],
                Body = message,
            });

            return Ok(new { success = true, message = $"Test SMS accepted by MessageMedia (HTTP {result.StatusCode})." });
        }
        catch (HttpRequestException ex)
        {
            return BadRequest(new { error = $"MessageMedia request failed: {ex.Message}" });
        }
        catch (TaskCanceledException)
        {
            return BadRequest(new { error = "MessageMedia request timed out after 30 seconds." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [RequirePermission(Permissions.Admin.ManageSettings)]
    [HttpPost("mex/test")]
    public async Task<IActionResult> TestMexIntegration([FromBody] TestMexRequest body)
    {
        var settings = (await db.SiteSettings.ToListAsync()).ToDictionary(s => s.Key, s => s.Value);

        var baseUrl = body.BaseUrl ?? settings.GetValueOrDefault("integration.mex.baseUrl");
        var apiKey = body.ApiKey ?? settings.GetValueOrDefault("integration.mex.apiKey");

        if (string.IsNullOrWhiteSpace(baseUrl))
            return BadRequest(new { error = "MEX base URL is not configured." });
        if (string.IsNullOrWhiteSpace(apiKey))
            return BadRequest(new { error = "MEX API key is not configured." });

        try
        {
            var url = baseUrl.TrimEnd('/') + "/Department/GetAll";
            using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
            http.DefaultRequestHeaders.Add("XApiKey", apiKey);
            var response = await http.GetAsync(url);

            if (response.IsSuccessStatusCode)
                return Ok(new { success = true, message = $"Connected to MEX successfully (HTTP {(int)response.StatusCode})." });

            return BadRequest(new { error = $"MEX API returned HTTP {(int)response.StatusCode}." });
        }
        catch (HttpRequestException ex)
        {
            return BadRequest(new { error = $"Could not reach MEX API: {ex.Message}" });
        }
        catch (TaskCanceledException)
        {
            return BadRequest(new { error = "Connection timed out after 10 seconds." });
        }
    }

    [RequirePermission(Permissions.Admin.ManageSettings)]
    [HttpPost("mex/test-request")]
    public async Task<IActionResult> TestMexRequest([FromBody] TestMexRequest body)
    {
        var settings = (await db.SiteSettings.ToListAsync()).ToDictionary(s => s.Key, s => s.Value);

        var baseUrl = body.BaseUrl ?? settings.GetValueOrDefault("integration.mex.baseUrl");
        var apiKey = body.ApiKey ?? settings.GetValueOrDefault("integration.mex.apiKey");

        if (string.IsNullOrWhiteSpace(baseUrl))
            return BadRequest(new { error = "MEX base URL is not configured." });
        if (string.IsNullOrWhiteSpace(apiKey))
            return BadRequest(new { error = "MEX API key is not configured." });

        var appEnvironment = Environment.GetEnvironmentVariable("APP_ENVIRONMENT") ?? "production";
        var isProduction = appEnvironment.Equals("production", StringComparison.OrdinalIgnoreCase);

        if (body.ConfirmedProduction != true && isProduction)
            return Ok(new { requiresConfirmation = true, environment = appEnvironment });

        try
        {
            using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(15) };
            http.DefaultRequestHeaders.Add("XApiKey", apiKey);
            var base_ = baseUrl.TrimEnd('/');

            int contactId = 1;
            try
            {
                var contactResp = await http.GetAsync(base_ + "/Contact/GetByUsername/admin");
                if (contactResp.IsSuccessStatusCode)
                {
                    var json = await contactResp.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(json);
                    if (doc.RootElement.TryGetProperty("contactId", out var cid))
                        contactId = cid.GetInt32();
                }
            }
            catch { }

            string? jobTypeName = null;
            try
            {
                var jtResp = await http.GetAsync(base_ + "/JobType/GetAll");
                if (jtResp.IsSuccessStatusCode)
                {
                    var json = await jtResp.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(json);
                    if (doc.RootElement.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var item in doc.RootElement.EnumerateArray())
                        {
                            if (item.TryGetProperty("isActive", out var active) && active.GetBoolean() &&
                                item.TryGetProperty("jobTypeName", out var name))
                            {
                                jobTypeName = name.GetString();
                                break;
                            }
                        }
                    }
                }
            }
            catch { }

            if (jobTypeName == null)
                return BadRequest(new { error = "Could not retrieve any active Job Types from MEX. Cannot create test request." });

            var requestNumber = int.Parse(DateTime.UtcNow.ToString("HHmmss"));
            var requestPayload = new
            {
                requestNumber,
                estimatedCost = 0,
                jobTypeName,
                requesterDetails = "SurveyFlow integration test - safe to delete.",
                jobDescription = $"Automated connectivity test from SurveyFlow ({DateTime.UtcNow:u}). Environment: {appEnvironment}.",
            };

            var response = await http.PostAsJsonAsync(base_ + $"/Request/{contactId}", requestPayload);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                int? newRequestNumber = null;
                try
                {
                    using var doc = JsonDocument.Parse(responseBody);
                    if (doc.RootElement.TryGetProperty("requestNumber", out var rn))
                        newRequestNumber = rn.GetInt32();
                }
                catch { }

                var msg = newRequestNumber.HasValue
                    ? $"Test request created successfully (Request #{newRequestNumber})."
                    : "Test request created successfully.";

                return Ok(new { success = true, message = msg, environment = appEnvironment });
            }

            return BadRequest(new { error = $"MEX returned HTTP {(int)response.StatusCode}: {responseBody}" });
        }
        catch (HttpRequestException ex)
        {
            return BadRequest(new { error = $"Could not reach MEX API: {ex.Message}" });
        }
        catch (TaskCanceledException)
        {
            return BadRequest(new { error = "Connection timed out after 10 seconds." });
        }
    }

    private static IntegrationsDto BuildIntegrationsDto(List<SiteSetting> settings)
    {
        var dict = settings.ToDictionary(s => s.Key, s => s.Value);
        return new IntegrationsDto
        {
            Email = new EmailIntegrationDto
            {
                Enabled = dict.GetValueOrDefault("integration.email.enabled") == "true",
                Provider = dict.GetValueOrDefault("integration.email.provider") ?? "smtp",
                SmtpHost = dict.GetValueOrDefault("integration.email.smtpHost"),
                SmtpPort = dict.GetValueOrDefault("integration.email.smtpPort"),
                SmtpUsername = dict.GetValueOrDefault("integration.email.smtpUsername"),
                SmtpPasswordSet = !string.IsNullOrEmpty(dict.GetValueOrDefault("integration.email.smtpPassword")),
                SmtpTls = dict.GetValueOrDefault("integration.email.smtpTls") != "false",
                SendgridApiKeySet = !string.IsNullOrEmpty(dict.GetValueOrDefault("integration.email.sendgridApiKey")),
                FromEmail = dict.GetValueOrDefault("integration.email.fromEmail"),
                FromName = dict.GetValueOrDefault("integration.email.fromName"),
            },
            Mex = new MexIntegrationDto
            {
                Enabled = dict.GetValueOrDefault("integration.mex.enabled") == "true",
                BaseUrl = dict.GetValueOrDefault("integration.mex.baseUrl"),
                ApiKeySet = !string.IsNullOrEmpty(dict.GetValueOrDefault("integration.mex.apiKey")),
            },
            Sms = new SmsIntegrationDto
            {
                Enabled = dict.GetValueOrDefault("integration.sms.enabled") == "true",
                Provider = dict.GetValueOrDefault("integration.sms.provider") ?? "messagemedia",
                MessageMediaApiKeySet = !string.IsNullOrEmpty(dict.GetValueOrDefault("integration.sms.messageMediaApiKey")),
                MessageMediaApiSecretSet = !string.IsNullOrEmpty(dict.GetValueOrDefault("integration.sms.messageMediaApiSecret")),
                SourceNumber = dict.GetValueOrDefault("integration.sms.sourceNumber"),
                SourceNumberType = dict.GetValueOrDefault("integration.sms.sourceNumberType"),
                CallbackUrl = dict.GetValueOrDefault("integration.sms.callbackUrl"),
                DeliveryReport = dict.GetValueOrDefault("integration.sms.deliveryReport") == "true",
            }
        };
    }
}
