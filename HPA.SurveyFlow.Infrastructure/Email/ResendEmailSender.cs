using System.Net.Http.Headers;
using System.Net.Http.Json;
using HPA.SurveyFlow.Domain.Email;
using Microsoft.Extensions.Logging;

namespace HPA.SurveyFlow.Infrastructure.Email;

public sealed class ResendEmailSender(
    string apiKey, string fromEmail, string fromName,
    bool testMode, ILogger logger) : IEmailSender
{
    private const string ApiUrl = "https://api.resend.com/emails";

    // Resend sandbox: use onboarding@resend.dev as from address and deliver only to the account owner.
    private const string SandboxFrom = "onboarding@resend.dev";
    private const string SandboxFromName = "SurveyFlow (Test)";

    public async Task SendAsync(EmailMessage message, CancellationToken ct = default)
    {
        var from = testMode
            ? $"{SandboxFromName} <{SandboxFrom}>"
            : $"{message.FromName ?? fromName} <{message.FromEmail ?? fromEmail}>";

        var attachments = message.Attachment == null ? Array.Empty<object>() :
        [new
        {
            filename = message.Attachment.FileName,
            content = Convert.ToBase64String(message.Attachment.Bytes)
        }];

        var payload = new
        {
            from,
            to = message.To.ToArray(),
            subject = message.Subject,
            html = message.BodyHtml,
            attachments
        };

        using var http = new HttpClient();
        http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

        logger.LogDebug("Resend sending to {Count} recipient(s){Mode}", message.To.Count, testMode ? " [SANDBOX — from onboarding@resend.dev]" : "");
        var response = await http.PostAsJsonAsync(ApiUrl, payload, ct);
        response.EnsureSuccessStatusCode();
    }
}
