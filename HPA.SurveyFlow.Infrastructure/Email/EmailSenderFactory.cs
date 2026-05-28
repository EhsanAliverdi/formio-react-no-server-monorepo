using HPA.SurveyFlow.Domain.Email;
using Microsoft.Extensions.Logging;

namespace HPA.SurveyFlow.Infrastructure.Email;

/// <summary>
/// Builds an IEmailSender from site settings stored in the database.
/// Settings keys (all under "integration.email.*"):
///   provider        — smtp | sendgrid | resend  (default: smtp)
///   testMode        — true | false              (default: false)
///   fromEmail       — sender address
///   fromName        — sender display name
///   sendgridApiKey  — SendGrid API key
///   resendApiKey    — Resend API key
///   smtpHost        — SMTP hostname
///   smtpPort        — SMTP port (default 587)
///   smtpUsername    — SMTP auth username
///   smtpPassword    — SMTP auth password
///   smtpTls         — true | false (default true)
/// </summary>
public static class EmailSenderFactory
{
    public static IEmailSender? Create(IReadOnlyDictionary<string, string?> settings, ILogger logger)
    {
        if (settings.GetValueOrDefault("integration.email.enabled") != "true")
            return null;

        var provider = settings.GetValueOrDefault("integration.email.provider") ?? "smtp";
        var testMode = settings.GetValueOrDefault("integration.email.testMode") == "true";
        var fromEmail = settings.GetValueOrDefault("integration.email.fromEmail") ?? "noreply@surveyflow.local";
        var fromName = settings.GetValueOrDefault("integration.email.fromName") ?? "SurveyFlow";

        return provider switch
        {
            "sendgrid" => CreateSendGrid(settings, fromEmail, fromName, testMode, logger),
            "resend"   => CreateResend(settings, fromEmail, fromName, testMode, logger),
            _          => CreateSmtp(settings, fromEmail, fromName, logger),
        };
    }

    private static IEmailSender? CreateSendGrid(
        IReadOnlyDictionary<string, string?> settings,
        string fromEmail, string fromName, bool testMode, ILogger logger)
    {
        var apiKey = settings.GetValueOrDefault("integration.email.sendgridApiKey");
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            logger.LogWarning("SendGrid provider selected but 'integration.email.sendgridApiKey' is not configured.");
            return null;
        }
        return new SendGridEmailSender(apiKey, fromEmail, fromName, testMode, logger);
    }

    private static IEmailSender? CreateResend(
        IReadOnlyDictionary<string, string?> settings,
        string fromEmail, string fromName, bool testMode, ILogger logger)
    {
        var apiKey = settings.GetValueOrDefault("integration.email.resendApiKey");
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            logger.LogWarning("Resend provider selected but 'integration.email.resendApiKey' is not configured.");
            return null;
        }
        return new ResendEmailSender(apiKey, fromEmail, fromName, testMode, logger);
    }

    private static IEmailSender? CreateSmtp(
        IReadOnlyDictionary<string, string?> settings,
        string fromEmail, string fromName, ILogger logger)
    {
        var host = settings.GetValueOrDefault("integration.email.smtpHost");
        if (string.IsNullOrWhiteSpace(host))
        {
            logger.LogWarning("SMTP provider selected but 'integration.email.smtpHost' is not configured.");
            return null;
        }

        var portStr = settings.GetValueOrDefault("integration.email.smtpPort") ?? "587";
        if (!int.TryParse(portStr, out var port)) port = 587;
        var username = settings.GetValueOrDefault("integration.email.smtpUsername");
        var password = settings.GetValueOrDefault("integration.email.smtpPassword");
        var tls = settings.GetValueOrDefault("integration.email.smtpTls") != "false";

        return new SmtpEmailSender(host, port, username, password, tls, fromEmail, fromName, logger);
    }
}
