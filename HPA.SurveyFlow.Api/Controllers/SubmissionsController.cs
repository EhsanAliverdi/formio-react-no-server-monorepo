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
            .FirstOrDefaultAsync(s => s.Id == id);

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
            .FirstOrDefaultAsync(s => s.Id == id);

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

    [RequirePermission(Permissions.Submissions.SecondarySubmit)]
    [HttpPost("{id:int}/secondary-submit")]
    public async Task<IActionResult> TriggerSecondarySubmit(
        int id,
        [FromServices] SecondarySubmitService secondarySubmitService,
        [FromQuery] string? outcome = null)
    {
        var submission = await db.FormSubmissions
            .Include(s => s.Form)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (submission == null)
            return NotFound(new { error = "Submission not found." });

        string integration, action, selectedOutcome;
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

            if (!FormsController.TryGetSecondarySubmitAction(formSchema, selectedOutcome, out integration, out action))
                return BadRequest(new { error = $"Secondary submit is not configured or not enabled for {selectedOutcome} submissions." });
        }
        catch { return BadRequest(new { error = "Could not parse form configuration." }); }

        if (string.IsNullOrWhiteSpace(integration) || string.IsNullOrWhiteSpace(action))
            return BadRequest(new { error = "Integration or action is not configured." });

        secondarySubmitService.DispatchAsync(integration, action, submission.Data, submission.Id, selectedOutcome);
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
            .Where(s => s.UserId == currentUser.Id)
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
            .FirstOrDefaultAsync(s => s.Id == id);

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
                .OrderBy(c => c.SubmittedAt)
                .Select(MapAdminSubmissionListItem)
                .ToList(),
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
            ChildSubmissions = s.ChildSubmissions
                .OrderBy(c => c.SubmittedAt)
                .Select(MapAdminSubmissionListItem)
                .ToList(),
        };
    }

    private static object? ParseJsonOrString(string? raw)
    {
        if (string.IsNullOrEmpty(raw)) return null;
        try { return JsonDocument.Parse(raw).RootElement; }
        catch { return raw; }
    }
}
