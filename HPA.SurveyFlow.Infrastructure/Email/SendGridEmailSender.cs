using System.Net.Http.Headers;
using System.Net.Http.Json;
using HPA.SurveyFlow.Domain.Email;
using Microsoft.Extensions.Logging;

namespace HPA.SurveyFlow.Infrastructure.Email;

public sealed class SendGridEmailSender(
    string apiKey, string fromEmail, string fromName,
    bool testMode, ILogger logger) : IEmailSender
{
    private const string ApiUrl = "https://api.sendgrid.com/v3/mail/send";

    public async Task SendAsync(EmailMessage message, CancellationToken ct = default)
    {
        var from = message.FromEmail ?? fromEmail;
        var name = message.FromName ?? fromName;

        // SendGrid sandbox mode: mail is accepted + validated but not delivered
        var mailSettings = testMode ? new { sandbox_mode = new { enable = true } } : null;

        var attachments = message.Attachment == null ? Array.Empty<object>() :
        [new
        {
            content = Convert.ToBase64String(message.Attachment.Bytes),
            filename = message.Attachment.FileName,
            type = message.Attachment.ContentType,
            disposition = "attachment"
        }];

        var payload = new
        {
            personalizations = new[] { new { to = message.To.Select(e => new { email = e }).ToArray() } },
            from = new { email = from, name },
            subject = message.Subject,
            content = new[] { new { type = "text/html", value = message.BodyHtml } },
            attachments,
            mail_settings = mailSettings
        };

        using var http = new HttpClient();
        http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

        logger.LogDebug("SendGrid sending to {Count} recipient(s){Mode}", message.To.Count, testMode ? " [SANDBOX]" : "");
        var response = await http.PostAsJsonAsync(ApiUrl, payload, ct);
        response.EnsureSuccessStatusCode();
    }
}
