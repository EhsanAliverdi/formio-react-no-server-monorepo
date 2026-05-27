using System.Net;
using System.Net.Mail;
using HPA.SurveyFlow.Domain.Email;
using Microsoft.Extensions.Logging;

namespace HPA.SurveyFlow.Infrastructure.Email;

public sealed class SmtpEmailSender(
    string host, int port, string? username, string? password, bool tls,
    string fromEmail, string fromName,
    ILogger logger) : IEmailSender
{
    public async Task SendAsync(EmailMessage message, CancellationToken ct = default)
    {
        using var client = new SmtpClient(host, port)
        {
            EnableSsl = tls,
            DeliveryMethod = SmtpDeliveryMethod.Network,
            UseDefaultCredentials = false,
        };

        if (!string.IsNullOrWhiteSpace(username) && !string.IsNullOrWhiteSpace(password))
            client.Credentials = new NetworkCredential(username, password);

        var from = message.FromEmail ?? fromEmail;
        var name = message.FromName ?? fromName;

        using var mail = new MailMessage
        {
            From = new MailAddress(from, name),
            Subject = message.Subject,
            Body = message.BodyHtml,
            IsBodyHtml = true,
        };

        foreach (var to in message.To)
            mail.To.Add(new MailAddress(to));

        if (message.Attachment is { } att)
            mail.Attachments.Add(new Attachment(new MemoryStream(att.Bytes), att.FileName, att.ContentType));

        logger.LogDebug("SMTP sending to {Count} recipient(s) via {Host}:{Port}", message.To.Count, host, port);
        await client.SendMailAsync(mail, ct);
    }
}
