using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HPA.SurveyFlow.Api.Authorization;
using HPA.SurveyFlow.Api.Extensions;
using HPA.SurveyFlow.Domain.DTOs.Requests;
using HPA.SurveyFlow.Domain.DTOs.Responses;
using HPA.SurveyFlow.Domain.Entities;
using HPA.SurveyFlow.Domain.Security;
using HPA.SurveyFlow.Infrastructure.Data;
using HPA.SurveyFlow.Infrastructure.Services;

namespace HPA.SurveyFlow.Api.Controllers;

[ApiController]
[Route("api/scheduled-reports")]
[RequirePermission(Permissions.Reports.Manage)]
public class ScheduledReportsController(
    AppDbContext db,
    ScheduledReportDeliveryService deliveryService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int? templateId)
    {
        var query = db.ScheduledReports.Include(s => s.ReportTemplate).AsQueryable();
        if (templateId.HasValue)
            query = query.Where(s => s.ReportTemplateId == templateId.Value);

        var schedules = await query.OrderBy(s => s.Name).ToListAsync();
        return Ok(schedules.Select(MapDto));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id)
    {
        var s = await db.ScheduledReports.Include(s => s.ReportTemplate).FirstOrDefaultAsync(s => s.Id == id);
        if (s == null) return NotFound(new { error = "Scheduled report not found." });
        return Ok(MapDto(s));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SaveScheduledReportRequest body)
    {
        var user = HttpContext.GetCurrentUser();
        if (user == null) return Unauthorized();

        var template = await db.ReportTemplates.FindAsync(body.ReportTemplateId);
        if (template == null) return NotFound(new { error = "Report template not found." });

        var schedule = new ScheduledReport
        {
            ReportTemplateId = body.ReportTemplateId,
            Name = body.Name.Trim(),
            CronExpression = body.CronExpression.Trim(),
            Recipients = body.Recipients.Trim(),
            Subject = body.Subject.Trim(),
            IsEnabled = body.IsEnabled,
            CreatedBy = user.Id,
            NextRunAt = CronHelper.NextOccurrence(body.CronExpression),
        };

        db.ScheduledReports.Add(schedule);
        await db.SaveChangesAsync();
        schedule.ReportTemplate = template;
        return CreatedAtAction(nameof(Get), new { id = schedule.Id }, MapDto(schedule));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] SaveScheduledReportRequest body)
    {
        var schedule = await db.ScheduledReports.Include(s => s.ReportTemplate).FirstOrDefaultAsync(s => s.Id == id);
        if (schedule == null) return NotFound(new { error = "Scheduled report not found." });

        schedule.Name = body.Name.Trim();
        schedule.CronExpression = body.CronExpression.Trim();
        schedule.Recipients = body.Recipients.Trim();
        schedule.Subject = body.Subject.Trim();
        schedule.IsEnabled = body.IsEnabled;
        schedule.UpdatedAt = DateTime.UtcNow;
        schedule.NextRunAt = CronHelper.NextOccurrence(body.CronExpression);

        await db.SaveChangesAsync();
        return Ok(MapDto(schedule));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var schedule = await db.ScheduledReports.FindAsync(id);
        if (schedule == null) return NotFound(new { error = "Scheduled report not found." });
        db.ScheduledReports.Remove(schedule);
        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Manually trigger delivery of a scheduled report immediately.</summary>
    [HttpPost("{id:int}/run")]
    public async Task<IActionResult> RunNow(int id)
    {
        var schedule = await db.ScheduledReports.FindAsync(id);
        if (schedule == null) return NotFound(new { error = "Scheduled report not found." });
        await deliveryService.DeliverAsync(id);
        return Ok(new { message = "Delivery triggered." });
    }

    private static ScheduledReportDto MapDto(ScheduledReport s) => new()
    {
        Id = s.Id,
        ReportTemplateId = s.ReportTemplateId,
        ReportName = s.ReportTemplate?.Name ?? string.Empty,
        Name = s.Name,
        CronExpression = s.CronExpression,
        Recipients = s.Recipients,
        Subject = s.Subject,
        IsEnabled = s.IsEnabled,
        CreatedBy = s.CreatedBy,
        CreatedAt = s.CreatedAt,
        UpdatedAt = s.UpdatedAt,
        LastRunAt = s.LastRunAt,
        NextRunAt = s.NextRunAt,
        LastRunStatus = s.LastRunStatus,
        LastRunError = s.LastRunError,
    };
}
