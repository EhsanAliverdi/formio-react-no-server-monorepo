using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Mail;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using HPA.SurveyFlow.Api.Extensions;
using HPA.SurveyFlow.Domain.DTOs.Requests;
using HPA.SurveyFlow.Domain.DTOs.Responses;
using HPA.SurveyFlow.Domain.Entities;
using HPA.SurveyFlow.Domain.Enums;
using HPA.SurveyFlow.Infrastructure.Data;
using HPA.SurveyFlow.Infrastructure.Services;

namespace HPA.SurveyFlow.Api.Controllers;

[ApiController]
[Route("api/forms")]
public class FormsController(AppDbContext db, FormAccessService formAccessService, SecondarySubmitService secondarySubmitService, PdfService pdfService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> ListForms([FromQuery] string? mode)
    {
        // PreStart mode: anonymous, returns only forms with appSettings.preStart == true
        if (string.Equals(mode, "prestart", StringComparison.OrdinalIgnoreCase))
        {
            var allForms = await db.Forms.ToListAsync();
            var preStartForms = allForms.Where(f =>
            {
                try
                {
                    var schema = f.Json is string s ? JsonDocument.Parse(s).RootElement : JsonDocument.Parse(f.Json).RootElement;
                    if (schema.TryGetProperty("appSettings", out var appSettings) &&
                        appSettings.TryGetProperty("preStart", out var preStartProp))
                    {
                        return preStartProp.ValueKind == JsonValueKind.True ||
                               (preStartProp.ValueKind == JsonValueKind.String && preStartProp.GetString() == "true");
                    }
                }
                catch { /* ignore malformed JSON */ }
                return false;
            }).ToList();
            return Ok(preStartForms.Select(f => MapFormDto(f, false)).ToList());
        }

        var currentUser = HttpContext.GetCurrentUser();
        var role = currentUser?.Role;
        var userId = currentUser?.Id;

        IEnumerable<Form> forms;
        if (role == UserRole.Admin || role == UserRole.Editor)
        {
            forms = await db.Forms
                .Include(f => f.AllowedRoles)
                .Include(f => f.AllowedUsers)
                .ToListAsync();
        }
        else
        {
            forms = await formAccessService.ListAccessibleFormsAsync(userId, role);
        }

        var isPrivileged = role == UserRole.Admin || role == UserRole.Editor;
        if (!isPrivileged)
            forms = forms.Where(f => f.ParentFormId == null);

        var result = forms.Select(f => MapFormDto(f, isPrivileged)).ToList();
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> CreateForm([FromBody] CreateFormRequest body)
    {
        User currentUser;
        try { currentUser = HttpContext.RequireRole(UserRole.Admin, UserRole.Editor); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        if (string.IsNullOrWhiteSpace(body.Name))
            return BadRequest(new { error = "Name is required." });
        if (body.Json == null || body.Json.Value.ValueKind == JsonValueKind.Undefined)
            return BadRequest(new { error = "JSON is required." });

        if (currentUser.Role != UserRole.Admin && body.AllowedUserIds?.Count > 0)
            return StatusCode(403, new { error = "Only admins can set allowed_user_ids." });

        var allowAnon = ParseBoolish(body.AllowAnonymousSubmit, defaultValue: true);
        if (body.ParentFormId.HasValue && !await db.Forms.AnyAsync(f => f.Id == body.ParentFormId.Value))
            return BadRequest(new { error = "Parent form does not exist." });

        var form = new Form
        {
            Name = body.Name,
            Json = body.Json.Value.GetRawText(),
            AllowAnonymousSubmit = allowAnon,
            Visibility = body.Visibility ?? FormVisibility.Public,
            ParentFormId = body.ParentFormId
        };

        db.Forms.Add(form);
        await db.SaveChangesAsync();

        if (body.AllowedRoles?.Count > 0)
        {
            foreach (var r in body.AllowedRoles)
                db.FormAllowedRoles.Add(new FormAllowedRole { FormId = form.Id, Role = r });
        }

        if (currentUser.Role == UserRole.Admin && body.AllowedUserIds?.Count > 0)
        {
            foreach (var uid in body.AllowedUserIds)
                db.FormAllowedUsers.Add(new FormAllowedUser { FormId = form.Id, UserId = uid });
        }

        await db.SaveChangesAsync();
        return Ok(new { success = true, id = form.Id });
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetForm(int id)
    {
        var currentUser = HttpContext.GetCurrentUser();
        var role = currentUser?.Role;
        var userId = currentUser?.Id;

        var form = await db.Forms
            .Include(f => f.AllowedRoles)
            .Include(f => f.AllowedUsers)
            .FirstOrDefaultAsync(f => f.Id == id);

        if (form == null)
            return NotFound(new { error = "Form not found." });

        var canAccess = await formAccessService.CanUserAccessFormAsync(id, userId, role);
        if (!canAccess)
            return StatusCode(403, new { error = "Access denied." });

        var isPrivileged = role == UserRole.Admin || role == UserRole.Editor;
        return Ok(MapFormDto(form, isPrivileged));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateForm(int id, [FromBody] UpdateFormRequest body)
    {
        User currentUser;
        try { currentUser = HttpContext.RequireRole(UserRole.Admin, UserRole.Editor); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        var form = await db.Forms
            .Include(f => f.AllowedRoles)
            .Include(f => f.AllowedUsers)
            .FirstOrDefaultAsync(f => f.Id == id);

        if (form == null)
            return NotFound(new { error = "Form not found." });

        if (currentUser.Role != UserRole.Admin && body.AllowedUserIds?.Count > 0)
            return StatusCode(403, new { error = "Only admins can set allowed_user_ids." });

        if (body.Name != null) form.Name = body.Name;
        if (body.Json != null && body.Json.Value.ValueKind != JsonValueKind.Undefined)
            form.Json = body.Json.Value.GetRawText();
        if (body.Visibility != null) form.Visibility = body.Visibility;
        if (body.ParentFormId.HasValue && body.ParentFormId.Value == id)
            return BadRequest(new { error = "A form cannot be its own parent." });
        if (body.ParentFormId.HasValue && !await db.Forms.AnyAsync(f => f.Id == body.ParentFormId.Value))
            return BadRequest(new { error = "Parent form does not exist." });
        form.ParentFormId = body.ParentFormId;
        if (body.AllowAnonymousSubmit != null)
            form.AllowAnonymousSubmit = ParseBoolish(body.AllowAnonymousSubmit, form.AllowAnonymousSubmit);

        // Sync allowed roles
        if (body.AllowedRoles != null)
        {
            db.FormAllowedRoles.RemoveRange(form.AllowedRoles);
            foreach (var r in body.AllowedRoles)
                db.FormAllowedRoles.Add(new FormAllowedRole { FormId = form.Id, Role = r });
        }

        // Sync allowed users (admin only)
        if (currentUser.Role == UserRole.Admin && body.AllowedUserIds != null)
        {
            db.FormAllowedUsers.RemoveRange(form.AllowedUsers);
            foreach (var uid in body.AllowedUserIds)
                db.FormAllowedUsers.Add(new FormAllowedUser { FormId = form.Id, UserId = uid });
        }

        await db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteForm(int id)
    {
        try { HttpContext.RequireRole(UserRole.Admin, UserRole.Editor); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        var form = await db.Forms.FindAsync(id);
        if (form == null)
            return NotFound(new { error = "Form not found." });

        db.Forms.Remove(form);
        await db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpPost("{id:int}/submit")]
    public async Task<IActionResult> SubmitForm(int id, [FromBody] SubmitFormRequest body)
    {
        var currentUser = HttpContext.GetCurrentUser();

        var form = await db.Forms
            .Include(f => f.AllowedRoles)
            .Include(f => f.AllowedUsers)
            .FirstOrDefaultAsync(f => f.Id == id);

        if (form == null)
            return NotFound(new { error = "Form not found." });

        // If form doesn't allow anonymous and user is not authenticated
        if (!form.AllowAnonymousSubmit && currentUser == null)
            return Unauthorized(new { error = "Authentication required to submit this form." });

        // If form is restricted and user can't access
        if (form.Visibility == FormVisibility.Restricted)
        {
            var canAccess = await formAccessService.CanUserAccessFormAsync(id, currentUser?.Id, currentUser?.Role);
            if (!canAccess)
                return StatusCode(403, new { error = "Access denied." });
        }

        var dataJson = body.Data?.GetRawText() ?? "{}";
        if (body.ParentSubmissionId.HasValue)
        {
            var parentSubmission = await db.FormSubmissions
                .Include(s => s.Form)
                .FirstOrDefaultAsync(s => s.Id == body.ParentSubmissionId.Value && s.DeletedAt == null);
            if (parentSubmission == null)
                return BadRequest(new { error = "Parent submission does not exist." });
            if (form.ParentFormId.HasValue && form.ParentFormId.Value != parentSubmission.FormId)
                return BadRequest(new { error = "This form is not configured as a child of the parent submission's form." });
        }

        var submission = new FormSubmission
        {
            FormId = form.Id,
            ParentSubmissionId = body.ParentSubmissionId,
            UserId = currentUser?.Id,
            Data = dataJson,
            SubmittedAt = DateTime.UtcNow
        };

        db.FormSubmissions.Add(submission);
        await db.SaveChangesAsync();

        var abnormalities = AbnormalitiesService.Compute(form.Json, dataJson);
        var errorCount = abnormalities.Count(a => a.Level == "error");
        var warningCount = abnormalities.Count(a => a.Level == "warning");

        // Dispatch secondary submit in background — does not block the response
        var outcome = errorCount > 0 ? "error" : warningCount > 0 ? "warning" : "success";

        try
        {
            var formSchema = JsonDocument.Parse(form.Json).RootElement;
            if (TryGetSecondarySubmitAction(formSchema, outcome, out var integration, out var action, out var submitConfigJson))
            {
                secondarySubmitService.DispatchAsync(integration, action, dataJson, submission.Id, outcome, submitConfigJson);
            }

            await TrySendOutcomeEmailAsync(form, submission, currentUser, formSchema, outcome, abnormalities, errorCount, warningCount, dataJson);
        }
        catch { /* never fail primary submit */ }

        return Ok(new
        {
            success = true,
            id = submission.Id,
            has_errors = errorCount > 0,
            has_warnings = warningCount > 0,
            error_count = errorCount,
            warning_count = warningCount,
            outcome,
            abnormalities = abnormalities.Select(a => new
            {
                key = a.Key,
                label = a.Label,
                level = a.Level,
                normal_value = a.NormalValue,
                actual_value = a.ActualValue
            }),
            next_form_id = TryGetNextFormId(form.Json, outcome, out var nextFormId) ? nextFormId : (int?)null
        });
    }

    private static FormDto MapFormDto(Form f, bool includeRestricted)
    {
        object jsonObj;
        try { jsonObj = JsonDocument.Parse(f.Json).RootElement; }
        catch { jsonObj = f.Json; }

        return new FormDto
        {
            Id = f.Id,
            Name = f.Name,
            Json = jsonObj,
            AllowAnonymousSubmit = f.AllowAnonymousSubmit ? 1 : 0,
            Visibility = f.Visibility,
            ParentFormId = f.ParentFormId,
            AllowedRoles = includeRestricted ? f.AllowedRoles.Select(r => r.Role).ToList() : null,
            AllowedUserIds = includeRestricted ? f.AllowedUsers.Select(u => u.UserId).ToList() : null
        };
    }

    internal static bool TryGetNextFormId(string formJson, string outcome, out int nextFormId)
    {
        nextFormId = 0;
        try
        {
            var schema = JsonDocument.Parse(formJson).RootElement;
            if (!schema.TryGetProperty("appSettings", out var appSettingsEl)
                || !appSettingsEl.TryGetProperty("nextForms", out var nextFormsEl)
                || !nextFormsEl.TryGetProperty(outcome, out var outcomeEl))
                return false;

            if (outcomeEl.ValueKind == JsonValueKind.Number)
                return outcomeEl.TryGetInt32(out nextFormId) && nextFormId > 0;

            if (outcomeEl.ValueKind == JsonValueKind.String
                && int.TryParse(outcomeEl.GetString(), out nextFormId))
                return nextFormId > 0;
        }
        catch { }

        return false;
    }

    internal static bool TryGetSecondarySubmitAction(JsonElement formSchema, string outcome, out string integration, out string action, out string configJson)
    {
        integration = "";
        action = "";
        configJson = "";

        if (!formSchema.TryGetProperty("appSettings", out var appSettingsEl)
            || !appSettingsEl.TryGetProperty("secondarySubmit", out var secEl))
            return false;

        if (secEl.TryGetProperty(outcome, out var outcomeEl))
            return TryReadSecondarySubmitAction(outcomeEl, out integration, out action, out configJson);

        // Backward compatibility for forms saved before outcome-specific secondary submit.
        return TryReadSecondarySubmitAction(secEl, out integration, out action, out configJson);
    }

    private static bool TryReadSecondarySubmitAction(JsonElement configEl, out string integration, out string action, out string configJson)
    {
        integration = "";
        action = "";
        configJson = configEl.GetRawText();

        if (!configEl.TryGetProperty("enabled", out var enabledEl) || enabledEl.ValueKind != JsonValueKind.True)
            return false;

        integration = configEl.TryGetProperty("integration", out var intEl) ? intEl.GetString() ?? "" : "";
        action = configEl.TryGetProperty("action", out var actEl) ? actEl.GetString() ?? "" : "";

        return !string.IsNullOrWhiteSpace(integration) && !string.IsNullOrWhiteSpace(action);
    }

    private static bool ParseBoolish(object? value, bool defaultValue = false)
    {
        return value switch
        {
            bool b => b,
            int i => i != 0,
            JsonElement el when el.ValueKind == JsonValueKind.True => true,
            JsonElement el when el.ValueKind == JsonValueKind.False => false,
            JsonElement el when el.ValueKind == JsonValueKind.Number => el.GetInt32() != 0,
            string s => s == "1" || s.Equals("true", StringComparison.OrdinalIgnoreCase),
            _ => defaultValue
        };
    }

    private async Task TrySendOutcomeEmailAsync(
        Form form,
        FormSubmission submission,
        User? currentUser,
        JsonElement formSchema,
        string outcome,
        IReadOnlyList<AbnormalitiesService.Abnormality> abnormalities,
        int errorCount,
        int warningCount,
        string dataJson)
    {
        if (!TryGetEmailNotificationConfig(formSchema, outcome, out var config))
            return;

        var settings = (await db.SiteSettings.ToListAsync()).ToDictionary(s => s.Key, s => (string?)s.Value);
        if (settings.GetValueOrDefault("integration.email.enabled") != "true")
            return;

        var recipients = ParseRecipients(config.To);
        if (recipients.Count == 0)
            return;

        using var submissionDataDoc = JsonDocument.Parse(string.IsNullOrWhiteSpace(dataJson) ? "{}" : dataJson);
        var submissionData = submissionDataDoc.RootElement;
        var placeholders = BuildEmailPlaceholders(form, submission, currentUser, outcome, abnormalities, errorCount, warningCount, submissionData);

        var subject = ReplacePlaceholders(config.Subject, placeholders);
        var bodyHtml = ReplacePlaceholders(config.BodyHtml, placeholders);
        if (string.IsNullOrWhiteSpace(subject) || string.IsNullOrWhiteSpace(bodyHtml))
            return;

        byte[]? pdfBytes = null;
        if (config.AttachPdf)
        {
            var pdfHtml = BuildSubmissionPdfHtml(form, submission, submissionData);
            pdfBytes = await pdfService.GeneratePdfAsync(pdfHtml);
        }

        await SendEmailAsync(settings, recipients, subject, bodyHtml, pdfBytes, $"submission-{submission.Id}.pdf");
    }

    private static bool TryGetEmailNotificationConfig(JsonElement formSchema, string outcome, out EmailNotificationConfig config)
    {
        config = default;

        if (!formSchema.TryGetProperty("appSettings", out var appSettingsEl)
            || !appSettingsEl.TryGetProperty("emailNotifications", out var emailEl)
            || !emailEl.TryGetProperty(outcome, out var outcomeEl))
            return false;

        var enabled = outcomeEl.TryGetProperty("enabled", out var enabledEl)
            && (enabledEl.ValueKind == JsonValueKind.True || enabledEl.GetRawText() == "true");
        if (!enabled)
            return false;

        config = new EmailNotificationConfig(
            enabled,
            outcomeEl.TryGetProperty("to", out var toEl) ? toEl.GetString() ?? string.Empty : string.Empty,
            outcomeEl.TryGetProperty("subject", out var subjectEl) ? subjectEl.GetString() ?? string.Empty : string.Empty,
            outcomeEl.TryGetProperty("bodyHtml", out var bodyEl) ? bodyEl.GetString() ?? string.Empty : string.Empty,
            outcomeEl.TryGetProperty("attachPdf", out var attachEl)
                && (attachEl.ValueKind == JsonValueKind.True || attachEl.GetRawText() == "true"));

        return true;
    }

    private static List<string> ParseRecipients(string raw)
    {
        return Regex.Split(raw ?? string.Empty, @"[;,\r\n]+")
            .Select(s => s.Trim())
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static Dictionary<string, string> BuildEmailPlaceholders(
        Form form,
        FormSubmission submission,
        User? currentUser,
        string outcome,
        IReadOnlyList<AbnormalitiesService.Abnormality> abnormalities,
        int errorCount,
        int warningCount,
        JsonElement submissionData)
    {
        var abnormalLabels = abnormalities.Select(a => a.Label ?? a.Key).Where(v => !string.IsNullOrWhiteSpace(v)).ToList();
        var errorLabels = abnormalities.Where(a => a.Level == "error").Select(a => a.Label ?? a.Key).Where(v => !string.IsNullOrWhiteSpace(v)).ToList();
        var warningLabels = abnormalities.Where(a => a.Level == "warning").Select(a => a.Label ?? a.Key).Where(v => !string.IsNullOrWhiteSpace(v)).ToList();

        return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["outcome"] = outcome,
            ["submission_id"] = submission.Id.ToString(),
            ["form_name"] = form.Name,
            ["user_email"] = currentUser?.Email ?? string.Empty,
            ["error_count"] = errorCount.ToString(),
            ["warning_count"] = warningCount.ToString(),
            ["abnormal_questions"] = string.Join(", ", abnormalLabels),
            ["error_questions"] = string.Join(", ", errorLabels),
            ["warning_questions"] = string.Join(", ", warningLabels),
            ["abnormal_answers"] = BuildAbnormalAnswersHtml(abnormalities, submissionData),
            ["error_answers"] = BuildAbnormalAnswersHtml(abnormalities.Where(a => a.Level == "error"), submissionData),
            ["warning_answers"] = BuildAbnormalAnswersHtml(abnormalities.Where(a => a.Level == "warning"), submissionData),
        };
    }

    private static string BuildAbnormalAnswersHtml(IEnumerable<AbnormalitiesService.Abnormality> abnormalities, JsonElement submissionData)
    {
        var items = abnormalities
            .Select(a =>
            {
                var label = WebUtility.HtmlEncode(a.Label ?? a.Key);
                var value = submissionData.ValueKind == JsonValueKind.Object && submissionData.TryGetProperty(a.Key, out var actual)
                    ? WebUtility.HtmlEncode(JsonElementToDisplayText(actual))
                    : string.Empty;
                return string.IsNullOrWhiteSpace(value) ? $"<li>{label}</li>" : $"<li><strong>{label}:</strong> {value}</li>";
            })
            .ToList();

        return items.Count == 0 ? string.Empty : $"<ul>{string.Join(string.Empty, items)}</ul>";
    }

    private static string ReplacePlaceholders(string template, IReadOnlyDictionary<string, string> placeholders)
    {
        var result = template ?? string.Empty;
        foreach (var (key, value) in placeholders)
            result = result.Replace($"{{{{{key}}}}}", value ?? string.Empty, StringComparison.OrdinalIgnoreCase);
        return result;
    }

    private static async Task SendEmailAsync(
        IReadOnlyDictionary<string, string?> settings,
        IReadOnlyList<string> recipients,
        string subject,
        string bodyHtml,
        byte[]? attachmentBytes,
        string attachmentFileName)
    {
        var provider = settings.GetValueOrDefault("integration.email.provider") ?? "smtp";
        var fromEmail = settings.GetValueOrDefault("integration.email.fromEmail") ?? "noreply@surveyflow.local";
        var fromName = settings.GetValueOrDefault("integration.email.fromName") ?? "SurveyFlow";

        if (provider == "sendgrid")
        {
          var apiKey = settings.GetValueOrDefault("integration.email.sendgridApiKey");
          if (string.IsNullOrWhiteSpace(apiKey)) return;

          using var http = new HttpClient();
          http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

          var attachments = attachmentBytes == null ? Array.Empty<object>() :
          [new
          {
              content = Convert.ToBase64String(attachmentBytes),
              filename = attachmentFileName,
              type = "application/pdf",
              disposition = "attachment"
          }];

          var payload = new
          {
              personalizations = new[] { new { to = recipients.Select(email => new { email }).ToArray() } },
              from = new { email = fromEmail, name = fromName },
              subject,
              content = new[] { new { type = "text/html", value = bodyHtml } },
              attachments
          };

          var response = await http.PostAsJsonAsync("https://api.sendgrid.com/v3/mail/send", payload);
          response.EnsureSuccessStatusCode();
          return;
        }

        var host = settings.GetValueOrDefault("integration.email.smtpHost");
        if (string.IsNullOrWhiteSpace(host)) return;

        var portStr = settings.GetValueOrDefault("integration.email.smtpPort") ?? "587";
        var username = settings.GetValueOrDefault("integration.email.smtpUsername");
        var password = settings.GetValueOrDefault("integration.email.smtpPassword");
        var tls = settings.GetValueOrDefault("integration.email.smtpTls") != "false";
        if (!int.TryParse(portStr, out var port)) port = 587;

        using var client = new SmtpClient(host, port)
        {
            EnableSsl = tls,
            DeliveryMethod = SmtpDeliveryMethod.Network,
            UseDefaultCredentials = false,
        };

        if (!string.IsNullOrWhiteSpace(username) && !string.IsNullOrWhiteSpace(password))
            client.Credentials = new NetworkCredential(username, password);

        using var message = new MailMessage
        {
            From = new MailAddress(fromEmail, fromName),
            Subject = subject,
            Body = bodyHtml,
            IsBodyHtml = true,
        };

        foreach (var recipient in recipients)
            message.To.Add(new MailAddress(recipient));

        if (attachmentBytes != null)
            message.Attachments.Add(new Attachment(new MemoryStream(attachmentBytes), attachmentFileName, "application/pdf"));

        await client.SendMailAsync(message);
    }

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

                return $@"<!doctype html>
<html>
<head>
    <meta charset=""utf-8"" />
    <style>
        body {{ font-family: Arial, sans-serif; padding: 24px; color: #111827; }}
        h1 {{ margin: 0 0 8px; font-size: 24px; }}
        p {{ margin: 0 0 16px; color: #4b5563; }}
        table {{ width: 100%; border-collapse: collapse; }}
        td {{ border: 1px solid #d1d5db; padding: 8px 10px; vertical-align: top; }}
        td:first-child {{ width: 32%; font-weight: 600; background: #f9fafb; }}
    </style>
</head>
<body>
    <h1>{WebUtility.HtmlEncode(form.Name)}</h1>
    <p>Submission #{submission.Id}</p>
    <table>{string.Join(string.Empty, rows)}</table>
</body>
</html>";
    }

    private static string JsonElementToDisplayText(JsonElement element)
    {
        return element.ValueKind switch
        {
            JsonValueKind.String => element.GetString() ?? string.Empty,
            JsonValueKind.Number => element.ToString(),
            JsonValueKind.True => "true",
            JsonValueKind.False => "false",
            JsonValueKind.Array => string.Join(", ", element.EnumerateArray().Select(JsonElementToDisplayText)),
            JsonValueKind.Object => element.GetRawText(),
            JsonValueKind.Null => string.Empty,
            _ => element.ToString(),
        };
    }

    private readonly record struct EmailNotificationConfig(bool Enabled, string To, string Subject, string BodyHtml, bool AttachPdf);
}
