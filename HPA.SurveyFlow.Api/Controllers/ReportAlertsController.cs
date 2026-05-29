using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HPA.SurveyFlow.Api.Authorization;
using HPA.SurveyFlow.Api.Extensions;
using HPA.SurveyFlow.Domain.Entities;
using HPA.SurveyFlow.Domain.Security;
using HPA.SurveyFlow.Infrastructure.Data;
using HPA.SurveyFlow.Infrastructure.Services;

namespace HPA.SurveyFlow.Api.Controllers;

[ApiController]
[Route("api/report-alerts")]
[RequirePermission(Permissions.Reports.ManageAlerts)]
public class ReportAlertsController(AppDbContext db, AlertEvaluatorService evaluator) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int? reportTemplateId)
    {
        var q = db.ReportAlerts.AsNoTracking().AsQueryable();
        if (reportTemplateId.HasValue) q = q.Where(a => a.ReportTemplateId == reportTemplateId.Value);
        var alerts = await q.OrderBy(a => a.Name).ToListAsync();
        return Ok(alerts.Select(MapDto));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id)
    {
        var alert = await db.ReportAlerts.FindAsync(id);
        if (alert == null) return NotFound(new { error = "Alert not found." });
        return Ok(MapDto(alert));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SaveReportAlertRequest body)
    {
        var user = HttpContext.GetCurrentUser();
        if (user == null) return Unauthorized();

        var template = await db.ReportTemplates.FindAsync(body.ReportTemplateId);
        if (template == null) return NotFound(new { error = "Report template not found." });

        var alert = new ReportAlert
        {
            ReportTemplateId   = body.ReportTemplateId,
            Name               = body.Name.Trim(),
            ConditionField     = body.ConditionField.Trim(),
            ConditionOperator  = body.ConditionOperator.Trim(),
            Threshold          = body.Threshold,
            EvaluationCron     = body.EvaluationCron.Trim(),
            Recipients         = body.Recipients?.Trim() ?? string.Empty,
            WebhookUrl         = body.WebhookUrl?.Trim(),
            IsEnabled          = body.IsEnabled,
            CreatedBy          = user.Id,
        };

        db.ReportAlerts.Add(alert);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = alert.Id }, MapDto(alert));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] SaveReportAlertRequest body)
    {
        var alert = await db.ReportAlerts.FindAsync(id);
        if (alert == null) return NotFound(new { error = "Alert not found." });

        alert.Name              = body.Name.Trim();
        alert.ConditionField    = body.ConditionField.Trim();
        alert.ConditionOperator = body.ConditionOperator.Trim();
        alert.Threshold         = body.Threshold;
        alert.EvaluationCron    = body.EvaluationCron.Trim();
        alert.Recipients        = body.Recipients?.Trim() ?? string.Empty;
        alert.WebhookUrl        = body.WebhookUrl?.Trim();
        alert.IsEnabled         = body.IsEnabled;
        alert.UpdatedAt         = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Ok(MapDto(alert));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var alert = await db.ReportAlerts.FindAsync(id);
        if (alert == null) return NotFound(new { error = "Alert not found." });
        db.ReportAlerts.Remove(alert);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id:int}/trigger")]
    public async Task<IActionResult> Trigger(int id)
    {
        var alert = await db.ReportAlerts.FindAsync(id);
        if (alert == null) return NotFound(new { error = "Alert not found." });
        await evaluator.EvaluateAsync(id);
        var updated = await db.ReportAlerts.FindAsync(id);
        return Ok(new { message = "Evaluation triggered.", last_status = updated?.LastStatus, last_value = updated?.LastValue });
    }

    private static object MapDto(ReportAlert a) => new
    {
        a.Id, a.ReportTemplateId, a.Name,
        a.ConditionField, a.ConditionOperator, a.Threshold,
        a.EvaluationCron, a.Recipients, a.WebhookUrl, a.IsEnabled,
        a.CreatedBy, a.CreatedAt, a.UpdatedAt,
        a.LastEvaluatedAt, a.LastTriggeredAt, a.LastValue, a.LastStatus, a.LastError,
    };
}

public sealed record SaveReportAlertRequest(
    int ReportTemplateId,
    string Name,
    string ConditionField,
    string ConditionOperator,
    decimal Threshold,
    string EvaluationCron,
    string? Recipients,
    string? WebhookUrl,
    bool IsEnabled);
