using System.Net;
using System.Text.Json;
using HPA.SurveyFlow.Domain.Email;
using HPA.SurveyFlow.Domain.Entities;
using HPA.SurveyFlow.Infrastructure.Data;
using HPA.SurveyFlow.Infrastructure.Email;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HPA.SurveyFlow.Infrastructure.Services;

/// <summary>
/// Sends notification emails for matched rules and logs overlap warnings when
/// multiple rules send to the same recipient for the same submission.
/// </summary>
public class NotificationRuleSenderService(
    AppDbContext db,
    PdfService pdfService,
    ILogger<NotificationRuleSenderService> logger)
{
    public async Task SendAsync(
        IReadOnlyList<FormNotificationRule> matchedRules,
        Form form,
        FormSubmission submission,
        User? currentUser,
        IReadOnlyList<AbnormalitiesService.Abnormality> abnormalities,
        int errorCount,
        int warningCount,
        JsonElement submissionData)
    {
        if (matchedRules.Count == 0) return;

        var settings = (await db.SiteSettings.ToListAsync()).ToDictionary(s => s.Key, s => (string?)s.Value);
        var sender = EmailSenderFactory.Create(settings, logger);
        if (sender == null)
        {
            logger.LogDebug("Email integration disabled or misconfigured — skipping {Count} notification rule(s) for submission {SubmissionId}", matchedRules.Count, submission.Id);
            return;
        }

        DetectAndLogOverlaps(matchedRules, submission.Id);

        var placeholders = BuildPlaceholders(form, submission, currentUser, abnormalities, errorCount, warningCount, submissionData);

        foreach (var rule in matchedRules.Where(r => r.Channel == "email" && r.EmailConfig != null))
        {
            var cfg = rule.EmailConfig!;
            var recipients = cfg.ToAddressesJson != null
                ? JsonSerializer.Deserialize<List<string>>(cfg.ToAddressesJson) ?? []
                : [];

            recipients = recipients.Where(r => !string.IsNullOrWhiteSpace(r)).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
            if (recipients.Count == 0) continue;

            var subject = ReplacePlaceholders(cfg.Subject, placeholders);
            var bodyHtml = ReplacePlaceholders(cfg.BodyHtml, placeholders);

            if (string.IsNullOrWhiteSpace(subject) || string.IsNullOrWhiteSpace(bodyHtml)) continue;

            byte[]? pdfBytes = null;
            if (cfg.AttachPdf)
            {
                try { pdfBytes = await pdfService.GeneratePdfAsync(BuildSubmissionPdfHtml(form, submission, submissionData)); }
                catch (Exception ex) { logger.LogWarning(ex, "PDF generation failed for rule {RuleId}", rule.Id); }
            }

            try
            {
                await sender.SendAsync(new EmailMessage
                {
                    To = recipients,
                    Subject = subject,
                    BodyHtml = bodyHtml,
                    Attachment = pdfBytes == null ? null : new EmailAttachment { Bytes = pdfBytes, FileName = $"submission-{submission.Id}.pdf" }
                });
                logger.LogInformation("Notification rule {RuleId} ({RuleName}) sent to {Count} recipient(s) for submission {SubmissionId}",
                    rule.Id, rule.Name, recipients.Count, submission.Id);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to send notification rule {RuleId} ({RuleName}) for submission {SubmissionId}",
                    rule.Id, rule.Name, submission.Id);
            }
        }
    }

    private void DetectAndLogOverlaps(IReadOnlyList<FormNotificationRule> matchedRules, int submissionId)
    {
        var emailRules = matchedRules.Where(r => r.Channel == "email" && r.EmailConfig != null).ToList();
        if (emailRules.Count < 2) return;

        var recipientToRules = new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);

        foreach (var rule in emailRules)
        {
            var addresses = rule.EmailConfig!.ToAddressesJson != null
                ? JsonSerializer.Deserialize<List<string>>(rule.EmailConfig.ToAddressesJson) ?? []
                : [];

            foreach (var addr in addresses.Where(a => !string.IsNullOrWhiteSpace(a)))
            {
                if (!recipientToRules.TryGetValue(addr, out var list))
                    recipientToRules[addr] = list = [];
                list.Add(rule.Name);
            }
        }

        foreach (var (recipient, ruleNames) in recipientToRules.Where(kv => kv.Value.Count > 1))
        {
            logger.LogWarning(
                "Notification overlap for submission {SubmissionId}: recipient {Recipient} will receive {Count} emails from rules: {Rules}",
                submissionId, recipient, ruleNames.Count, string.Join(", ", ruleNames));
        }
    }

    private static Dictionary<string, string> BuildPlaceholders(
        Form form,
        FormSubmission submission,
        User? currentUser,
        IReadOnlyList<AbnormalitiesService.Abnormality> abnormalities,
        int errorCount,
        int warningCount,
        JsonElement submissionData)
    {
        var abnormalLabels = abnormalities.Select(a => a.Label ?? a.Key).Where(v => !string.IsNullOrWhiteSpace(v)).ToList();
        var errorLabels = abnormalities.Where(a => a.Level == "error").Select(a => a.Label ?? a.Key).Where(v => !string.IsNullOrWhiteSpace(v)).ToList();
        var warningLabels = abnormalities.Where(a => a.Level == "warning").Select(a => a.Label ?? a.Key).Where(v => !string.IsNullOrWhiteSpace(v)).ToList();

        var dict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["submission_id"]      = submission.Id.ToString(),
            ["submitted_at"]       = submission.SubmittedAt.ToString("f"),
            ["form_name"]          = form.Name,
            ["user_email"]         = currentUser?.Email ?? string.Empty,
            ["user_fullname"]      = currentUser?.DisplayName ?? string.Join(" ", new[] { currentUser?.FirstName, currentUser?.LastName }.Where(s => !string.IsNullOrWhiteSpace(s))),
            ["error_count"]        = errorCount.ToString(),
            ["warning_count"]      = warningCount.ToString(),
            ["abnormal_questions"] = string.Join(", ", abnormalLabels),
            ["error_questions"]    = string.Join(", ", errorLabels),
            ["warning_questions"]  = string.Join(", ", warningLabels),
            ["abnormal_answers_table"] = BuildAbnormalAnswersHtml(abnormalities, submissionData),
            ["error_answers_table"]    = BuildAbnormalAnswersHtml(abnormalities.Where(a => a.Level == "error"), submissionData),
            ["warning_answers_table"]  = BuildAbnormalAnswersHtml(abnormalities.Where(a => a.Level == "warning"), submissionData),
            ["all_answers_table"]      = BuildAllAnswersHtml(submissionData),
            ["matched_conditions"]     = string.Join(", ", abnormalLabels), // best-effort summary
        };

        // Add individual field placeholders: {{field:fieldKey}}
        if (submissionData.ValueKind == JsonValueKind.Object)
        {
            foreach (var prop in submissionData.EnumerateObject())
                dict[$"field:{prop.Name}"] = JsonElementToDisplayText(prop.Value);
        }

        return dict;
    }

    private static string ReplacePlaceholders(string template, IReadOnlyDictionary<string, string> placeholders)
    {
        var result = template ?? string.Empty;
        foreach (var (key, value) in placeholders)
            result = result.Replace($"{{{{{key}}}}}", value ?? string.Empty, StringComparison.OrdinalIgnoreCase);
        return result;
    }

    private static string BuildAbnormalAnswersHtml(IEnumerable<AbnormalitiesService.Abnormality> abnormalities, JsonElement submissionData)
    {
        var items = abnormalities.Select(a =>
        {
            var label = WebUtility.HtmlEncode(a.Label ?? a.Key);
            var value = submissionData.ValueKind == JsonValueKind.Object && submissionData.TryGetProperty(a.Key, out var actual)
                ? WebUtility.HtmlEncode(JsonElementToDisplayText(actual))
                : string.Empty;
            return string.IsNullOrWhiteSpace(value) ? $"<li>{label}</li>" : $"<li><strong>{label}:</strong> {value}</li>";
        }).ToList();

        return items.Count == 0 ? string.Empty : $"<ul>{string.Join(string.Empty, items)}</ul>";
    }

    private static string BuildAllAnswersHtml(JsonElement submissionData)
    {
        if (submissionData.ValueKind != JsonValueKind.Object) return string.Empty;
        var rows = submissionData.EnumerateObject()
            .Where(p => !p.NameEquals("submit"))
            .Select(p => $"<tr><td style=\"font-weight:600;padding:6px 10px;background:#f9fafb;width:35%\">{WebUtility.HtmlEncode(p.Name)}</td><td style=\"padding:6px 10px\">{WebUtility.HtmlEncode(JsonElementToDisplayText(p.Value))}</td></tr>")
            .ToList();
        return rows.Count == 0 ? string.Empty : $"<table style=\"width:100%;border-collapse:collapse;border:1px solid #e5e7eb\">{string.Join(string.Empty, rows)}</table>";
    }

    private static string JsonElementToDisplayText(JsonElement el) => el.ValueKind switch
    {
        JsonValueKind.String    => el.GetString() ?? string.Empty,
        JsonValueKind.Number    => el.GetRawText(),
        JsonValueKind.True      => "Yes",
        JsonValueKind.False     => "No",
        JsonValueKind.Null      => string.Empty,
        JsonValueKind.Array     => string.Join(", ", el.EnumerateArray().Select(JsonElementToDisplayText)),
        _                       => el.GetRawText()
    };

    private static string BuildSubmissionPdfHtml(Form form, FormSubmission submission, JsonElement submissionData)
    {
        var rows = new List<string>();
        if (submissionData.ValueKind == JsonValueKind.Object)
        {
            foreach (var property in submissionData.EnumerateObject())
            {
                if (property.NameEquals("submit")) continue;
                rows.Add($"<tr><td>{WebUtility.HtmlEncode(property.Name)}</td><td>{WebUtility.HtmlEncode(JsonElementToDisplayText(property.Value))}</td></tr>");
            }
        }

        return $$"""
            <!doctype html>
            <html>
            <head><meta charset="utf-8" /><style>
              body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
              h1 { margin: 0 0 8px; font-size: 24px; }
              p { margin: 0 0 16px; color: #4b5563; }
              table { width: 100%; border-collapse: collapse; }
              td { border: 1px solid #d1d5db; padding: 8px 10px; vertical-align: top; }
              td:first-child { width: 32%; font-weight: 600; background: #f9fafb; }
            </style></head>
            <body>
              <h1>{{WebUtility.HtmlEncode(form.Name)}}</h1>
              <p>Submission #{{submission.Id}} — {{submission.SubmittedAt:f}}</p>
              <table>{{string.Join(string.Empty, rows)}}</table>
            </body></html>
            """;
    }

}
