using Microsoft.AspNetCore.Mvc;
using HPA.SurveyFlow.Api.Authorization;
using HPA.SurveyFlow.Domain.DTOs.Requests;
using HPA.SurveyFlow.Domain.Security;
using HPA.SurveyFlow.Infrastructure.Services;

namespace HPA.SurveyFlow.Api.Controllers;

[ApiController]
[Route("api/pdf-exports")]
public class PdfExportsController(PdfService pdfService) : ControllerBase
{
    [RequirePermission(Permissions.Submissions.ExportPdf)]
    [HttpPost]
    public async Task<IActionResult> ExportPdf([FromBody] PdfExportRequest body)
    {
        if (string.IsNullOrWhiteSpace(body.Html))
            return BadRequest(new { error = "HTML is required." });

        const int maxBytes = 5 * 1024 * 1024;
        if (System.Text.Encoding.UTF8.GetByteCount(body.Html) > maxBytes)
            return StatusCode(413, new { error = "Payload too large. Maximum 5MB." });

        byte[] pdfBytes;
        try { pdfBytes = await pdfService.GeneratePdfAsync(body.Html); }
        catch (Exception ex) { return StatusCode(500, new { error = $"PDF generation failed: {ex.Message}" }); }

        var fileName = string.IsNullOrWhiteSpace(body.FileName)
            ? "export.pdf"
            : body.FileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase)
                ? body.FileName
                : $"{body.FileName}.pdf";

        Response.Headers.Append("Content-Disposition", $"attachment; filename=\"{fileName}\"");
        return File(pdfBytes, "application/pdf");
    }
}
