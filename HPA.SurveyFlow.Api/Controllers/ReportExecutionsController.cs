using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HPA.SurveyFlow.Api.Authorization;
using HPA.SurveyFlow.Api.Extensions;
using HPA.SurveyFlow.Domain.DTOs.Requests;
using HPA.SurveyFlow.Domain.Security;
using HPA.SurveyFlow.Infrastructure.Data;
using HPA.SurveyFlow.Infrastructure.Services;

namespace HPA.SurveyFlow.Api.Controllers;

[ApiController]
[Route("api/report-executions")]
[RequirePermission(Permissions.Reports.Read)]
public class ReportExecutionsController(AppDbContext db, ReportQueryEngineService queryEngine, ILogger<ReportExecutionsController> logger) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Run([FromBody] RunReportRequest body)
    {
        body.PageSize = Math.Clamp(body.PageSize, 1, 200);
        body.Page = Math.Max(body.Page, 1);

        var user = HttpContext.GetCurrentUser();
        var isManager = user?.Role is "admin" or "editor";

        var template = await db.ReportTemplates.FindAsync(body.TemplateId);
        if (template == null) return NotFound(new { error = "Report template not found." });
        if (!isManager && !template.IsPublic) return Forbid();

        try
        {
            var result = await queryEngine.ExecuteAsync(template, body);
            return Ok(result);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Report execution failed for template {TemplateId}", body.TemplateId);
            return StatusCode(500, new { error = "Report execution failed.", detail = ex.Message, stackTrace = ex.StackTrace });
        }
    }

    [HttpGet("export-csv")]
    public async Task<IActionResult> ExportCsv(
        [FromQuery] int templateId,
        [FromQuery] string? sortField,
        [FromQuery] string? sortDirection,
        [FromQuery] string? runtimeFilters)
    {
        var user = HttpContext.GetCurrentUser();
        var isManager = user?.Role is "admin" or "editor";

        var template = await db.ReportTemplates
            .Include(t => t.Form)
            .FirstOrDefaultAsync(t => t.Id == templateId);

        if (template == null) return NotFound(new { error = "Report template not found." });
        if (!isManager && !template.IsPublic) return Forbid();

        var request = new RunReportRequest
        {
            TemplateId = templateId,
            SortField = sortField,
            SortDirection = sortDirection,
            Page = 1,
            PageSize = 10000, // large page for full export
        };

        if (!string.IsNullOrWhiteSpace(runtimeFilters))
        {
            try
            {
                request.RuntimeFilters = JsonDocument.Parse(runtimeFilters).RootElement;
            }
            catch { }
        }

        var result = await queryEngine.ExecuteAsync(template, request);

        var sb = new StringBuilder();

        // Header row
        sb.AppendLine(string.Join(",", result.Columns.Select(c => CsvEscape(c.Label))));

        // Data rows
        foreach (var row in result.Rows)
        {
            var values = result.Columns.Select(c =>
            {
                row.TryGetValue(c.FieldKey, out var val);
                return CsvEscape(val?.ToString() ?? string.Empty);
            });
            sb.AppendLine(string.Join(",", values));
        }

        var fileName = $"{SanitiseFileName(template.Name)}_{DateTime.UtcNow:yyyyMMdd}.csv";
        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        return File(bytes, "text/csv", fileName);
    }

    private static string CsvEscape(string value)
    {
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
            return $"\"{value.Replace("\"", "\"\"")}\"";
        return value;
    }

    private static string SanitiseFileName(string name) =>
        System.Text.RegularExpressions.Regex.Replace(name, @"[^a-zA-Z0-9_\-]", "_");
}
