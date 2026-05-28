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
public class ReportExecutionsController(
    AppDbContext db,
    ReportQueryEngineService queryEngine,
    AggregationPipelineService aggregationPipeline,
    ExcelExportService excelExport,
    UserContextService userContext,
    ILogger<ReportExecutionsController> logger) : ControllerBase
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
        if (!CanAccess(template, user?.Role)) return Forbid();

        try
        {
            var rlsClause = await BuildRlsClause(template, user);
            var sw = System.Diagnostics.Stopwatch.StartNew();
            var result = IsAggregation(template)
                ? await aggregationPipeline.ExecuteAsync(template, body, rlsClause)
                : await queryEngine.ExecuteAsync(template, body, rlsClause);
            sw.Stop();
            await LogExecutionAsync(template.Id, user?.Id, (int)sw.ElapsedMilliseconds, result.Total, "view");
            return Ok(result);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Report execution failed for template {TemplateId}", body.TemplateId);
            return StatusCode(500, new { error = "Report execution failed.", detail = ex.Message });
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
        var template = await db.ReportTemplates.Include(t => t.Form).FirstOrDefaultAsync(t => t.Id == templateId);
        if (template == null) return NotFound(new { error = "Report template not found." });
        if (!CanAccess(template, user?.Role)) return Forbid();

        var request = BuildExportRequest(templateId, sortField, sortDirection, runtimeFilters);
        var rlsClause = await BuildRlsClause(template, user);
        var sw = System.Diagnostics.Stopwatch.StartNew();
        var result = IsAggregation(template)
            ? await aggregationPipeline.ExecuteAsync(template, request, rlsClause)
            : await queryEngine.ExecuteAsync(template, request, rlsClause);
        sw.Stop();
        await LogExecutionAsync(template.Id, user?.Id, (int)sw.ElapsedMilliseconds, result.Total, "export_csv");

        var sb = new StringBuilder();
        sb.AppendLine(string.Join(",", result.Columns.Select(c => CsvEscape(c.Label))));
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
        return File(Encoding.UTF8.GetBytes(sb.ToString()), "text/csv", fileName);
    }

    [HttpGet("export-excel")]
    public async Task<IActionResult> ExportExcel(
        [FromQuery] int templateId,
        [FromQuery] string? sortField,
        [FromQuery] string? sortDirection,
        [FromQuery] string? runtimeFilters)
    {
        var user = HttpContext.GetCurrentUser();
        var template = await db.ReportTemplates.Include(t => t.Form).FirstOrDefaultAsync(t => t.Id == templateId);
        if (template == null) return NotFound(new { error = "Report template not found." });
        if (!CanAccess(template, user?.Role)) return Forbid();

        var request = BuildExportRequest(templateId, sortField, sortDirection, runtimeFilters);
        var rlsClause = await BuildRlsClause(template, user);
        var sw = System.Diagnostics.Stopwatch.StartNew();
        var result = IsAggregation(template)
            ? await aggregationPipeline.ExecuteAsync(template, request, rlsClause)
            : await queryEngine.ExecuteAsync(template, request, rlsClause);
        sw.Stop();
        await LogExecutionAsync(template.Id, user?.Id, (int)sw.ElapsedMilliseconds, result.Total, "export_excel");

        var bytes = excelExport.GenerateWorkbook(template, result.Columns, result.Rows);
        var fileName = $"{SanitiseFileName(template.Name)}_{DateTime.UtcNow:yyyyMMdd}.xlsx";
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static bool CanAccess(Domain.Entities.ReportTemplate template, string? role)
    {
        if (role is "admin" or "editor") return true;
        if (template.IsPublic) return true;
        if (string.IsNullOrWhiteSpace(role)) return false;
        if (template.SharedWithRolesJson == null) return false;
        // Simple contains check — avoids deserialisation overhead for this hot path
        return template.SharedWithRolesJson.Contains($"\"{role}\"");
    }

    private static bool IsAggregation(Domain.Entities.ReportTemplate template) =>
        !string.IsNullOrWhiteSpace(template.GroupByJson) || !string.IsNullOrWhiteSpace(template.MeasuresJson);

    private async Task<string?> BuildRlsClause(Domain.Entities.ReportTemplate template, Domain.Entities.User? user)
    {
        var policies = await db.RlsPolicies
            .Where(p => p.ReportTemplateId == template.Id && p.IsActive)
            .ToListAsync();
        return policies.Count == 0 ? null : userContext.BuildRlsClause(policies, user);
    }

    private async Task LogExecutionAsync(int templateId, int? userId, int durationMs, int rowCount, string execType)
    {
        try
        {
            db.ReportExecutionLogs.Add(new Domain.Entities.ReportExecutionLog
            {
                ReportTemplateId = templateId,
                UserId = userId,
                DurationMs = durationMs,
                RowCount = rowCount,
                ExecutionType = execType,
                ExecutedAt = DateTime.UtcNow,
            });
            await db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to write execution log for template {TemplateId}", templateId);
        }
    }

    private static RunReportRequest BuildExportRequest(int templateId, string? sortField, string? sortDirection, string? runtimeFilters)
    {
        var request = new RunReportRequest
        {
            TemplateId = templateId,
            SortField = sortField,
            SortDirection = sortDirection,
            Page = 1,
            PageSize = 10000,
        };
        if (!string.IsNullOrWhiteSpace(runtimeFilters))
            try { request.RuntimeFilters = JsonDocument.Parse(runtimeFilters).RootElement; } catch { }
        return request;
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
