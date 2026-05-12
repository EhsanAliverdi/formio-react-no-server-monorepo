using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using SurveyFlow.Api.Extensions;
using SurveyFlow.Core.DTOs.Requests;
using SurveyFlow.Core.DTOs.Responses;
using SurveyFlow.Core.Enums;
using SurveyFlow.Infrastructure.Data;
using SurveyFlow.Infrastructure.Services;

namespace SurveyFlow.Api.Controllers;

[ApiController]
[Route("api/submissions")]
public class SubmissionsController(AppDbContext db, PdfService pdfService) : ControllerBase
{
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
}
