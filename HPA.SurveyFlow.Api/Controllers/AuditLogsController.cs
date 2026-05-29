using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text;
using HPA.SurveyFlow.Api.Authorization;
using HPA.SurveyFlow.Domain.Security;
using HPA.SurveyFlow.Infrastructure.Data;

namespace HPA.SurveyFlow.Api.Controllers;

[ApiController]
[Route("api/audit-logs")]
[RequirePermission(Permissions.AuditLogs.Read)]
public class AuditLogsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? entityType,
        [FromQuery] int? actorId,
        [FromQuery] DateTime? dateFrom,
        [FromQuery] DateTime? dateTo,
        [FromQuery] string? search,
        [FromQuery] int limit = 100,
        [FromQuery] int offset = 0)
    {
        limit = Math.Clamp(limit, 1, 500);

        var q = db.AuditLogs.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(entityType))
            q = q.Where(a => a.EntityType == entityType);
        if (actorId.HasValue)
            q = q.Where(a => a.ActorId == actorId);
        if (dateFrom.HasValue)
            q = q.Where(a => a.OccurredAt >= dateFrom.Value);
        if (dateTo.HasValue)
            q = q.Where(a => a.OccurredAt <= dateTo.Value);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            q = q.Where(a =>
                a.ActorEmail.ToLower().Contains(s) ||
                a.EntityType.ToLower().Contains(s) ||
                (a.EntityName != null && a.EntityName.ToLower().Contains(s)) ||
                a.EntityId.ToLower().Contains(s));
        }

        var total = await q.CountAsync();
        var items = await q
            .OrderByDescending(a => a.OccurredAt)
            .Skip(offset)
            .Take(limit)
            .Select(a => new
            {
                a.Id, a.ActorId, a.ActorEmail, a.Action,
                a.EntityType, a.EntityId, a.EntityName,
                a.ChangesJson, a.IpAddress, a.OccurredAt,
            })
            .ToListAsync();

        return Ok(new { total, items });
    }

    [HttpGet("export-csv")]
    public async Task<IActionResult> ExportCsv(
        [FromQuery] string? entityType,
        [FromQuery] int? actorId,
        [FromQuery] DateTime? dateFrom,
        [FromQuery] DateTime? dateTo)
    {
        var q = db.AuditLogs.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(entityType)) q = q.Where(a => a.EntityType == entityType);
        if (actorId.HasValue) q = q.Where(a => a.ActorId == actorId);
        if (dateFrom.HasValue) q = q.Where(a => a.OccurredAt >= dateFrom.Value);
        if (dateTo.HasValue)   q = q.Where(a => a.OccurredAt <= dateTo.Value);

        var rows = await q.OrderByDescending(a => a.OccurredAt)
            .Take(10_000)
            .Select(a => new { a.OccurredAt, a.ActorEmail, a.Action, a.EntityType, a.EntityId, a.EntityName, a.IpAddress })
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("occurred_at,actor_email,action,entity_type,entity_id,entity_name,ip_address");
        foreach (var r in rows)
            sb.AppendLine($"{r.OccurredAt:o},{Csv(r.ActorEmail)},{Csv(r.Action)},{Csv(r.EntityType)},{Csv(r.EntityId)},{Csv(r.EntityName ?? "")},{Csv(r.IpAddress ?? "")}");

        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        return File(bytes, "text/csv", $"audit-log-{DateTime.UtcNow:yyyy-MM-dd}.csv");
    }

    [HttpGet("entity-types")]
    public async Task<IActionResult> EntityTypes()
    {
        var types = await db.AuditLogs.Select(a => a.EntityType).Distinct().OrderBy(t => t).ToListAsync();
        return Ok(types);
    }

    private static string Csv(string v) =>
        v.Contains(',') || v.Contains('"') || v.Contains('\n')
            ? $"\"{v.Replace("\"", "\"\"")}\""
            : v;
}
