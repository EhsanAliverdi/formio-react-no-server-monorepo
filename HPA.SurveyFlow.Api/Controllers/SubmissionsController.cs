using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HPA.SurveyFlow.Api.Authorization;
using System.Text.Json;
using HPA.SurveyFlow.Api.Extensions;
using HPA.SurveyFlow.Domain.DTOs.Requests;
using HPA.SurveyFlow.Domain.DTOs.Responses;
using HPA.SurveyFlow.Domain.Entities;
using HPA.SurveyFlow.Domain.Enums;
using HPA.SurveyFlow.Domain.Security;
using HPA.SurveyFlow.Infrastructure.Data;
using HPA.SurveyFlow.Infrastructure.Services;

namespace HPA.SurveyFlow.Api.Controllers;

[ApiController]
[Route("api/submissions")]
public class SubmissionsController(AppDbContext db, PdfService pdfService) : ControllerBase
{
    [RequirePermission(Permissions.Submissions.ReadAll)]
    [HttpGet]
    public async Task<IActionResult> ListAdminSubmissions(
        [FromQuery] int limit = 25,
        [FromQuery] int offset = 0,
        [FromQuery] int? form_id = null,
        [FromQuery] string? q = null,
        [FromQuery] string? from = null,
        [FromQuery] string? to = null)
    {
        limit = Math.Clamp(limit, 1, 200);
        if (offset < 0) offset = 0;

        var query = db.FormSubmissions
            .Include(s => s.Form)
            .Include(s => s.User)
            .Include(s => s.ChildSubmissions)
                .ThenInclude(c => c.Form)
            .Include(s => s.ChildSubmissions)
                .ThenInclude(c => c.User)
            .Where(s => s.DeletedAt == null)
            .AsQueryable();

        if (form_id.HasValue)
            query = query.Where(s => s.FormId == form_id.Value);
        else
            query = query.Where(s => s.ParentSubmissionId == null);

        if (!string.IsNullOrWhiteSpace(q))
        {
            if (int.TryParse(q, out var subId))
                query = query.Where(s => s.Id == subId || (s.User != null && s.User.Email.Contains(q)));
            else
                query = query.Where(s => s.User != null && s.User.Email.Contains(q));
        }

        if (!string.IsNullOrWhiteSpace(from) && DateOnly.TryParse(from, out var fromDate))
        {
            var fromDt = fromDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            query = query.Where(s => s.SubmittedAt >= fromDt);
        }

        if (!string.IsNullOrWhiteSpace(to) && DateOnly.TryParse(to, out var toDate))
        {
            var toDt = toDate.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc);
            query = query.Where(s => s.SubmittedAt <= toDt);
        }

        var total = await query.CountAsync();

        var submissions = await query
            .OrderByDescending(s => s.SubmittedAt)
            .Skip(offset)
            .Take(limit)
            .ToListAsync();

        var items = submissions.Select(MapAdminSubmissionListItem).ToList();

        return Ok(new { items, total, limit, offset });
    }

    [RequirePermission(Permissions.Submissions.ReadAll)]
    [HttpGet("{id:int}/detail")]
    public async Task<IActionResult> GetAdminSubmission(int id)
    {
        var submission = await db.FormSubmissions
            .Include(s => s.Form)
            .Include(s => s.User)
            .Include(s => s.ChildSubmissions)
                .ThenInclude(c => c.Form)
            .Include(s => s.ChildSubmissions)
                .ThenInclude(c => c.User)
            .FirstOrDefaultAsync(s => s.Id == id && s.DeletedAt == null);

        if (submission == null)
            return NotFound(new { error = "Submission not found." });

        return Ok(await BuildAdminSubmissionDetailDto(submission));
    }

    [RequirePermission(Permissions.Submissions.UpdateAll)]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateAdminSubmission(int id, [FromBody] UpdateSubmissionRequest body)
    {
        var currentUser = HttpContext.RequireUser();

        var submission = await db.FormSubmissions
            .Include(s => s.Form)
            .Include(s => s.User)
            .Include(s => s.ChildSubmissions)
                .ThenInclude(c => c.Form)
            .Include(s => s.ChildSubmissions)
                .ThenInclude(c => c.User)
            .FirstOrDefaultAsync(s => s.Id == id && s.DeletedAt == null);

        if (submission == null)
            return NotFound(new { error = "Submission not found." });

        if (body.Data.HasValue && body.Data.Value.ValueKind != JsonValueKind.Undefined)
        {
            var historyEntry = new
            {
                editedBy = currentUser.Id,
                editedAt = DateTime.UtcNow.ToString("O"),
                previousData = submission.Data
            };

            List<object> history;
            if (!string.IsNullOrEmpty(submission.EditHistory))
            {
                try { history = JsonSerializer.Deserialize<List<object>>(submission.EditHistory) ?? []; }
                catch { history = []; }
            }
            else
            {
                history = [];
            }

            history.Add(historyEntry);
            submission.EditHistory = JsonSerializer.Serialize(history);
            submission.Data = body.Data.Value.GetRawText();
            submission.UpdatedAt = DateTime.UtcNow;
            submission.UpdatedBy = currentUser.Id;

            await db.SaveChangesAsync();
        }

        return Ok(await BuildAdminSubmissionDetailDto(submission));
    }

    [RequirePermission(Permissions.Submissions.UpdateAll)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteAdminSubmission(int id)
    {
        var currentUser = HttpContext.RequireUser();

        var root = await db.FormSubmissions
            .FirstOrDefaultAsync(s => s.Id == id && s.DeletedAt == null);

        if (root == null)
            return NotFound(new { error = "Submission not found." });

        var deleteRootId = root.ParentSubmissionId ?? root.Id;
        var submissions = await db.FormSubmissions
            .Where(s => s.DeletedAt == null && (s.Id == deleteRootId || s.ParentSubmissionId == deleteRootId))
            .ToListAsync();

        var deletedAt = DateTime.UtcNow;
        foreach (var submission in submissions)
        {
            submission.DeletedAt = deletedAt;
            submission.DeletedBy = currentUser.Id;
            submission.DeleteReason = id == deleteRootId
                ? "Deleted by admin."
                : $"Deleted with parent submission #{deleteRootId}.";
        }

        await db.SaveChangesAsync();
        return Ok(new { success = true, deleted_count = submissions.Count, root_submission_id = deleteRootId });
    }

    [RequirePermission(Permissions.Submissions.SecondarySubmit)]
    [HttpPost("{id:int}/secondary-submit")]
    public async Task<IActionResult> TriggerSecondarySubmit(
        int id,
        [FromServices] SecondarySubmitService secondarySubmitService,
        [FromQuery] string? outcome = null)
    {
        var submission = await db.FormSubmissions
            .Include(s => s.Form)
            .FirstOrDefaultAsync(s => s.Id == id && s.DeletedAt == null);

        if (submission == null)
            return NotFound(new { error = "Submission not found." });

        string integration, action, selectedOutcome, submitConfigJson;
        try
        {
            var formSchema = JsonDocument.Parse(submission.Form.Json).RootElement;
            var abnormalities = AbnormalitiesService.Compute(submission.Form.Json, submission.Data);
            var submissionOutcome = abnormalities.Any(a => a.Level == "error")
                ? "error"
                : abnormalities.Any(a => a.Level == "warning") ? "warning" : "success";

            selectedOutcome = string.IsNullOrWhiteSpace(outcome) ? submissionOutcome : outcome.Trim().ToLowerInvariant();
            if (selectedOutcome is not ("success" or "warning" or "error"))
                return BadRequest(new { error = "Outcome must be success, warning, or error." });
            if (selectedOutcome != submissionOutcome)
                return BadRequest(new { error = $"Current submission outcome is {submissionOutcome}. {selectedOutcome} integration submit is not available for the current form values." });

            if (!FormsController.TryGetSecondarySubmitAction(formSchema, selectedOutcome, out integration, out action, out submitConfigJson))
                return BadRequest(new { error = $"Secondary submit is not configured or not enabled for {selectedOutcome} submissions." });
        }
        catch { return BadRequest(new { error = "Could not parse form configuration." }); }

        if (string.IsNullOrWhiteSpace(integration) || string.IsNullOrWhiteSpace(action))
            return BadRequest(new { error = "Integration or action is not configured." });

        secondarySubmitService.DispatchAsync(integration, action, submission.Data, submission.Id, selectedOutcome, submitConfigJson);
        return Ok(new { success = true, message = $"Secondary submit triggered for {selectedOutcome}.", outcome = selectedOutcome });
    }

    [RequirePermission(Permissions.Submissions.ReadOwn)]
    [HttpGet("me")]
    public async Task<IActionResult> MySubmissions()
    {
        try { HttpContext.RequireRole(UserRole.Admin, UserRole.Editor, UserRole.Viewer); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        var currentUser = HttpContext.GetCurrentUser()!;

        var submissions = await db.FormSubmissions
            .Include(s => s.Form)
            .Where(s => s.UserId == currentUser.Id && s.DeletedAt == null)
            .OrderByDescending(s => s.SubmittedAt)
            .ToListAsync();

        var items = submissions.Select(s => new SubmissionListItemDto
        {
            Id = s.Id,
            FormId = s.FormId,
            FormName = s.Form.Name,
            SubmittedAt = s.SubmittedAt,
            CanExportPdf = true
        }).ToList();

        return Ok(new { items });
    }

    [RequirePermission(Permissions.Submissions.ReadOwn)]
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetSubmission(int id)
    {
        try { HttpContext.RequireRole(UserRole.Admin, UserRole.Editor, UserRole.Viewer); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        var currentUser = HttpContext.GetCurrentUser()!;

        var submission = await db.FormSubmissions
            .Include(s => s.Form)
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.Id == id && s.DeletedAt == null);

        if (submission == null)
            return NotFound(new { error = "Submission not found." });

        var isPrivileged = currentUser.Role == UserRole.Admin || currentUser.Role == UserRole.Editor;
        if (!isPrivileged && submission.UserId != currentUser.Id)
            return StatusCode(403, new { error = "Access denied." });

        object? formObj = null;
        try { formObj = JsonDocument.Parse(submission.Form.Json).RootElement; } catch { }

        object? dataObj = null;
        try { dataObj = JsonDocument.Parse(submission.Data).RootElement; } catch { }

        var dto = new SubmissionDetailDto
        {
            Id = submission.Id,
            FormId = submission.FormId,
            FormName = submission.Form.Name,
            UserId = submission.UserId,
            UserEmail = submission.User?.Email,
            SubmittedAt = submission.SubmittedAt,
            UpdatedAt = submission.UpdatedAt,
            Form = formObj,
            Data = dataObj,
            CanExportPdf = true
        };

        return Ok(dto);
    }

    [RequirePermission(Permissions.Submissions.ExportPdf)]
    [HttpPost("{id:int}/pdf")]
    public async Task<IActionResult> ExportPdf(int id, [FromBody] PdfExportRequest body)
    {
        try { HttpContext.RequireRole(UserRole.Admin, UserRole.Editor, UserRole.Viewer); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        if (string.IsNullOrWhiteSpace(body.Html))
            return BadRequest(new { error = "HTML is required." });

        const int maxBytes = 5 * 1024 * 1024;
        if (System.Text.Encoding.UTF8.GetByteCount(body.Html) > maxBytes)
            return StatusCode(413, new { error = "Payload too large. Maximum 5MB." });

        byte[] pdfBytes;
        try { pdfBytes = await pdfService.GeneratePdfAsync(body.Html); }
        catch (Exception ex) { return StatusCode(500, new { error = $"PDF generation failed: {ex.Message}" }); }

        var fileName = string.IsNullOrWhiteSpace(body.FileName)
            ? $"submission-{id}.pdf"
            : body.FileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase)
                ? body.FileName
                : $"{body.FileName}.pdf";

        Response.Headers.Append("Content-Disposition", $"attachment; filename=\"{fileName}\"");
        return File(pdfBytes, "application/pdf");
    }

    private async Task<AdminSubmissionDetailDto> BuildAdminSubmissionDetailDto(FormSubmission submission)
    {
        User? updatedByUser = null;
        if (submission.UpdatedBy.HasValue)
            updatedByUser = await db.Users.FindAsync(submission.UpdatedBy.Value);

        object? formObj = null;
        try { formObj = JsonDocument.Parse(submission.Form.Json).RootElement; } catch { }

        object? dataObj = null;
        try { dataObj = JsonDocument.Parse(submission.Data).RootElement; } catch { }

        object? editHistoryObj = null;
        if (!string.IsNullOrEmpty(submission.EditHistory))
        {
            try { editHistoryObj = JsonDocument.Parse(submission.EditHistory).RootElement; } catch { }
        }

        var abnormalities = AbnormalitiesService.Compute(submission.Form.Json, submission.Data);
        var abnormalityDtos = abnormalities
            .Select(a => new AbnormalityDto { Key = a.Key, Type = a.Type, Label = a.Label, NormalValue = a.NormalValue, Level = a.Level })
            .ToList();

        var ruleLogs = await db.SubmissionRuleLogs
            .Where(l => l.SubmissionId == submission.Id)
            .OrderBy(l => l.TriggeredAt)
            .ToListAsync();

        return new AdminSubmissionDetailDto
        {
            Id = submission.Id,
            FormId = submission.FormId,
            FormName = submission.Form.Name,
            ParentSubmissionId = submission.ParentSubmissionId,
            UserId = submission.UserId,
            UserEmail = submission.User?.Email,
            SubmittedAt = submission.SubmittedAt,
            UpdatedAt = submission.UpdatedAt,
            UpdatedBy = submission.UpdatedBy,
            UpdatedByEmail = updatedByUser?.Email,
            EditHistory = editHistoryObj,
            Form = formObj,
            Data = dataObj,
            HasAbnormalities = abnormalities.Count > 0,
            ErrorCount = abnormalities.Count(a => a.Level == "error"),
            WarningCount = abnormalities.Count(a => a.Level == "warning"),
            Abnormalities = abnormalityDtos,
            SecondarySubmitStatus = submission.SecondarySubmitStatus,
            SecondarySubmitAt = submission.SecondarySubmitAt,
            SecondarySubmitResponse = ParseJsonOrString(submission.SecondarySubmitResponse),
            ChildSubmissions = submission.ChildSubmissions
                .Where(c => c.DeletedAt == null)
                .OrderBy(c => c.SubmittedAt)
                .Select(MapAdminSubmissionListItem)
                .ToList(),
            RuleLogs = ruleLogs.Select(l => new SubmissionRuleLogDto
            {
                Id = l.Id,
                RuleId = l.RuleId,
                RuleName = l.RuleName,
                RuleType = l.RuleType,
                Channel = l.Channel,
                Action = l.Action,
                Status = l.Status,
                RequestJson = l.RequestJson,
                ResponseJson = l.ResponseJson,
                StatusCode = l.StatusCode,
                ErrorMessage = l.ErrorMessage,
                TriggeredAt = l.TriggeredAt,
                CompletedAt = l.CompletedAt,
            }).ToList(),
        };
    }

    private static AdminSubmissionListItemDto MapAdminSubmissionListItem(FormSubmission s)
    {
        var abnormalities = AbnormalitiesService.Compute(s.Form.Json, s.Data);
        return new AdminSubmissionListItemDto
        {
            Id = s.Id,
            FormId = s.FormId,
            FormName = s.Form.Name,
            ParentSubmissionId = s.ParentSubmissionId,
            UserId = s.UserId,
            UserEmail = s.User?.Email,
            SubmittedAt = s.SubmittedAt,
            HasAbnormalities = abnormalities.Count > 0,
            ErrorCount = abnormalities.Count(a => a.Level == "error"),
            WarningCount = abnormalities.Count(a => a.Level == "warning"),
            SecondarySubmitStatus = s.SecondarySubmitStatus,
            SecondarySubmitRef = ExtractIntegrationRef(s.SecondarySubmitResponse, s.Form.Json),
            ChildSubmissions = s.ChildSubmissions
                .Where(c => c.DeletedAt == null)
                .OrderBy(c => c.SubmittedAt)
                .Select(MapAdminSubmissionListItem)
                .ToList(),
        };
    }

    /// <summary>
    /// Extracts the integration reference value (e.g. MEX requestNumber) from the stored
    /// secondary submit response JSON. The field name is configured per-outcome in
    /// appSettings.secondarySubmit.{outcome}.responseRefField; defaults to "requestNumber" for MEX.
    /// </summary>
    private static string? ExtractIntegrationRef(string? responseJson, string? formJson)
    {
        if (string.IsNullOrWhiteSpace(responseJson)) return null;

        try
        {
            using var logDoc = JsonDocument.Parse(responseJson);
            var log = logDoc.RootElement;

            // Determine the configured responseRefField from appSettings
            var refField = ResolveRefField(formJson, log);
            if (string.IsNullOrWhiteSpace(refField)) return null;

            // The response body is stored as a JSON string inside result.body
            if (!log.TryGetProperty("result", out var result)) return null;
            string? bodyStr = null;
            if (result.ValueKind == JsonValueKind.Object && result.TryGetProperty("body", out var bodyEl))
                bodyStr = bodyEl.ValueKind == JsonValueKind.String ? bodyEl.GetString() : bodyEl.GetRawText();

            if (string.IsNullOrWhiteSpace(bodyStr)) return null;

            using var bodyDoc = JsonDocument.Parse(bodyStr);
            if (bodyDoc.RootElement.TryGetProperty(refField, out var refEl))
            {
                var val = refEl.ValueKind == JsonValueKind.String ? refEl.GetString() : refEl.GetRawText();
                return string.IsNullOrWhiteSpace(val) ? null : val;
            }
        }
        catch { }

        return null;
    }

    private static string? ResolveRefField(string? formJson, JsonElement log)
    {
        // Try to get configured responseRefField from appSettings.secondarySubmit.{outcome}
        if (!string.IsNullOrWhiteSpace(formJson))
        {
            try
            {
                using var formDoc = JsonDocument.Parse(formJson);
                if (formDoc.RootElement.TryGetProperty("appSettings", out var appSettings) &&
                    appSettings.TryGetProperty("secondarySubmit", out var secondarySubmit))
                {
                    // Pick the outcome from the log
                    var outcome = log.TryGetProperty("outcome", out var outcomeEl) ? outcomeEl.GetString() : null;
                    if (!string.IsNullOrWhiteSpace(outcome) &&
                        secondarySubmit.TryGetProperty(outcome, out var outcomeConfig) &&
                        outcomeConfig.TryGetProperty("responseRefField", out var fieldEl) &&
                        fieldEl.GetString() is { Length: > 0 } configured)
                        return configured;

                    // Fall back: check any outcome config that has responseRefField
                    foreach (var prop in secondarySubmit.EnumerateObject())
                    {
                        if (prop.Value.TryGetProperty("responseRefField", out var f) &&
                            f.GetString() is { Length: > 0 } fallback)
                            return fallback;
                    }
                }
            }
            catch { }
        }

        // Default: MEX create_request always returns requestNumber
        if (log.TryGetProperty("integration", out var intEl) && intEl.GetString() == "mex" &&
            log.TryGetProperty("action", out var actEl) && actEl.GetString() == "create_request")
            return "requestNumber";

        return null;
    }

    private static object? ParseJsonOrString(string? raw)
    {
        if (string.IsNullOrEmpty(raw)) return null;
        try { return JsonDocument.Parse(raw).RootElement; }
        catch { return raw; }
    }
}
