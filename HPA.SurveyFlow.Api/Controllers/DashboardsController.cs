using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
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
[Route("api/reporting/dashboards")]
public class DashboardsController(
    AppDbContext db,
    ReportQueryEngineService queryEngine,
    AggregationPipelineService aggregationPipeline,
    UserContextService userContext) : ControllerBase
{
    [HttpGet]
    [RequirePermission(Permissions.Reports.Read)]
    public async Task<IActionResult> List()
    {
        var dashboards = await DashboardQuery()
            .OrderBy(d => d.Name)
            .ToListAsync();
        return Ok(dashboards.Select(MapDto));
    }

    [HttpGet("{id:int}")]
    [RequirePermission(Permissions.Reports.Read)]
    public async Task<IActionResult> Get(int id)
    {
        var dashboard = await DashboardQuery().FirstOrDefaultAsync(d => d.Id == id);
        return dashboard == null
            ? NotFound(new { error = "Dashboard not found." })
            : Ok(MapDto(dashboard));
    }

    [HttpGet("by-slug/{slug}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetBySlug(string slug)
    {
        var dashboard = await DashboardQuery()
            .FirstOrDefaultAsync(d => d.Slug == slug && d.IsActive);
        if (dashboard == null) return NotFound(new { error = "Dashboard not found." });
        if (!CanViewDashboard(dashboard)) return Unauthorized(new { error = "Sign in to view this dashboard." });
        return Ok(MapDto(dashboard));
    }

    [HttpPost]
    [RequirePermission(Permissions.Reports.Manage)]
    public async Task<IActionResult> Create([FromBody] SaveDashboardRequest body)
    {
        var user = HttpContext.GetCurrentUser();
        if (user == null) return Unauthorized();

        var slug = NormaliseSlug(body.Slug);
        var validation = await ValidateDashboard(body.Name, slug, body.Visibility);
        if (validation != null) return validation;

        var dashboard = new Dashboard
        {
            Name = body.Name.Trim(),
            Slug = slug,
            Description = body.Description?.Trim(),
            Visibility = body.Visibility,
            IsActive = body.IsActive,
            CreatedByUserId = user.Id,
        };
        db.Dashboards.Add(dashboard);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = dashboard.Id }, MapDto(dashboard));
    }

    [HttpPut("{id:int}")]
    [RequirePermission(Permissions.Reports.Manage)]
    public async Task<IActionResult> Update(int id, [FromBody] SaveDashboardRequest body)
    {
        var dashboard = await DashboardQuery().FirstOrDefaultAsync(d => d.Id == id);
        if (dashboard == null) return NotFound(new { error = "Dashboard not found." });

        var slug = NormaliseSlug(body.Slug);
        var validation = await ValidateDashboard(body.Name, slug, body.Visibility, id);
        if (validation != null) return validation;

        dashboard.Name = body.Name.Trim();
        dashboard.Slug = slug;
        dashboard.Description = body.Description?.Trim();
        dashboard.Visibility = body.Visibility;
        dashboard.IsActive = body.IsActive;
        dashboard.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(MapDto(dashboard));
    }

    [HttpDelete("{id:int}")]
    [RequirePermission(Permissions.Reports.Manage)]
    public async Task<IActionResult> Delete(int id)
    {
        var dashboard = await db.Dashboards.FindAsync(id);
        if (dashboard == null) return NotFound(new { error = "Dashboard not found." });
        db.Dashboards.Remove(dashboard);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id:int}/cards")]
    [RequirePermission(Permissions.Reports.Manage)]
    public async Task<IActionResult> AddCard(int id, [FromBody] SaveDashboardCardRequest body)
    {
        var dashboard = await db.Dashboards.FindAsync(id);
        if (dashboard == null) return NotFound(new { error = "Dashboard not found." });
        var template = await db.ReportTemplates.FindAsync(body.ReportId);
        if (template == null) return NotFound(new { error = "Report template not found." });

        var card = new DashboardCard { DashboardId = id, ReportTemplateId = body.ReportId };
        ApplyCard(card, body);
        db.DashboardCards.Add(card);
        await db.SaveChangesAsync();
        card.ReportTemplate = template;
        return Ok(MapCard(card));
    }

    [HttpPut("{id:int}/cards/{cardId:int}")]
    [RequirePermission(Permissions.Reports.Manage)]
    public async Task<IActionResult> UpdateCard(int id, int cardId, [FromBody] SaveDashboardCardRequest body)
    {
        var card = await db.DashboardCards.Include(c => c.ReportTemplate)
            .FirstOrDefaultAsync(c => c.Id == cardId && c.DashboardId == id);
        if (card == null) return NotFound(new { error = "Dashboard card not found." });
        if (body.ReportId != card.ReportTemplateId && !await db.ReportTemplates.AnyAsync(t => t.Id == body.ReportId))
            return NotFound(new { error = "Report template not found." });

        ApplyCard(card, body);
        card.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        if (card.ReportTemplateId != card.ReportTemplate.Id)
            card.ReportTemplate = (await db.ReportTemplates.FindAsync(card.ReportTemplateId))!;
        return Ok(MapCard(card));
    }

    [HttpDelete("{id:int}/cards/{cardId:int}")]
    [RequirePermission(Permissions.Reports.Manage)]
    public async Task<IActionResult> DeleteCard(int id, int cardId)
    {
        var card = await db.DashboardCards.FirstOrDefaultAsync(c => c.Id == cardId && c.DashboardId == id);
        if (card == null) return NotFound(new { error = "Dashboard card not found." });
        db.DashboardCards.Remove(card);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("{id:int}/layout")]
    [RequirePermission(Permissions.Reports.Manage)]
    public async Task<IActionResult> SaveLayout(int id, [FromBody] SaveDashboardLayoutRequest body)
    {
        var cards = await db.DashboardCards.Where(c => c.DashboardId == id).ToListAsync();
        if (cards.Count == 0 && !await db.Dashboards.AnyAsync(d => d.Id == id))
            return NotFound(new { error = "Dashboard not found." });

        var updates = body.Cards.ToDictionary(c => c.DashboardCardId);
        foreach (var card in cards)
        {
            if (!updates.TryGetValue(card.Id, out var update)) continue;
            card.X = Math.Max(0, update.X);
            card.Y = Math.Max(0, update.Y);
            card.W = Math.Clamp(update.W, 1, 12);
            card.H = Math.Max(1, update.H);
            card.UpdatedAt = DateTime.UtcNow;
        }
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("by-slug/{slug}/cards/{cardId:int}/execute")]
    [AllowAnonymous]
    public async Task<IActionResult> ExecuteCard(string slug, int cardId, [FromBody] RunReportRequest body)
    {
        var dashboard = await DashboardQuery()
            .FirstOrDefaultAsync(d => d.Slug == slug && d.IsActive);
        if (dashboard == null) return NotFound(new { error = "Dashboard not found." });
        if (!CanViewDashboard(dashboard)) return Unauthorized(new { error = "Sign in to view this dashboard." });

        var card = dashboard.Cards.FirstOrDefault(c => c.Id == cardId);
        if (card == null) return NotFound(new { error = "Dashboard card not found." });

        var user = HttpContext.GetCurrentUser();
        if (!CanViewReport(card.ReportTemplate, user?.Role)) return Forbid();

        body.TemplateId = card.ReportTemplateId;
        body.Page = Math.Max(1, body.Page);
        body.PageSize = Math.Clamp(body.PageSize, 1, 200);
        var rlsClause = await BuildRlsClause(card.ReportTemplate, user);
        try
        {
            var result = IsAggregation(card.ReportTemplate)
                ? await aggregationPipeline.ExecuteAsync(card.ReportTemplate, body, rlsClause)
                : await queryEngine.ExecuteAsync(card.ReportTemplate, body, rlsClause);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message, detail = ex.InnerException?.Message });
        }
    }

    private IQueryable<Dashboard> DashboardQuery() =>
        db.Dashboards.Include(d => d.Cards).ThenInclude(c => c.ReportTemplate);

    private bool CanViewDashboard(Dashboard dashboard) =>
        dashboard.Visibility == "public" || HttpContext.GetCurrentUser() != null;

    private static bool CanViewReport(ReportTemplate template, string? role)
    {
        if (role is "admin" or "editor") return true;
        if (template.IsPublic) return true;
        if (string.IsNullOrWhiteSpace(role) || template.SharedWithRolesJson == null) return false;
        return template.SharedWithRolesJson.Contains($"\"{role}\"");
    }

    private async Task<string?> BuildRlsClause(ReportTemplate template, User? user)
    {
        var policies = await db.RlsPolicies.Where(p => p.ReportTemplateId == template.Id && p.IsActive).ToListAsync();
        return policies.Count == 0 ? null : userContext.BuildRlsClause(policies, user);
    }

    private static bool IsAggregation(ReportTemplate template) =>
        !string.IsNullOrWhiteSpace(template.GroupByJson) || !string.IsNullOrWhiteSpace(template.MeasuresJson);

    private async Task<IActionResult?> ValidateDashboard(string name, string slug, string visibility, int? currentId = null)
    {
        if (string.IsNullOrWhiteSpace(name)) return BadRequest(new { error = "Dashboard name is required." });
        if (string.IsNullOrWhiteSpace(slug)) return BadRequest(new { error = "Dashboard slug is required." });
        if (visibility is not ("public" or "restricted")) return BadRequest(new { error = "Dashboard visibility must be public or restricted." });
        if (await db.Dashboards.AnyAsync(d => d.Slug == slug && d.Id != currentId))
            return Conflict(new { error = "Dashboard slug already exists." });
        return null;
    }

    private static string NormaliseSlug(string value) =>
        Regex.Replace(value.Trim().ToLowerInvariant(), @"[^a-z0-9]+", "-").Trim('-');

    private static void ApplyCard(DashboardCard card, SaveDashboardCardRequest body)
    {
        card.ReportTemplateId = body.ReportId;
        card.TitleOverride = body.TitleOverride?.Trim();
        card.X = Math.Max(0, body.X);
        card.Y = Math.Max(0, body.Y);
        card.W = Math.Clamp(body.W, 1, 12);
        card.H = Math.Max(1, body.H);
        card.MinW = body.MinW;
        card.MinH = body.MinH;
        card.MaxW = body.MaxW;
        card.MaxH = body.MaxH;
        card.SettingsJson = body.SettingsJson;
        card.ShowTitle = body.ShowTitle;
        card.FitContent = body.FitContent;
        card.CustomCss = body.CustomCss?.Trim();
        card.DisplayMode = body.DisplayMode is "chart" or "table" or "both" ? body.DisplayMode : "chart";
    }

    private static DashboardDto MapDto(Dashboard dashboard) => new()
    {
        Id = dashboard.Id,
        Name = dashboard.Name,
        Slug = dashboard.Slug,
        Description = dashboard.Description,
        Visibility = dashboard.Visibility,
        IsActive = dashboard.IsActive,
        CreatedByUserId = dashboard.CreatedByUserId,
        CreatedAt = dashboard.CreatedAt,
        UpdatedAt = dashboard.UpdatedAt,
        Cards = dashboard.Cards.OrderBy(c => c.Y).ThenBy(c => c.X).Select(MapCard).ToList(),
    };

    private static DashboardCardDto MapCard(DashboardCard card) => new()
    {
        Id = card.Id,
        DashboardId = card.DashboardId,
        ReportId = card.ReportTemplateId,
        ReportName = card.ReportTemplate.Name,
        ReportChartType = card.ReportTemplate.ChartType,
        ReportChartConfig = ParseJson(card.ReportTemplate.ChartConfigJson),
        TitleOverride = card.TitleOverride,
        X = card.X,
        Y = card.Y,
        W = card.W,
        H = card.H,
        MinW = card.MinW,
        MinH = card.MinH,
        MaxW = card.MaxW,
        MaxH = card.MaxH,
        SettingsJson = card.SettingsJson,
        ShowTitle = card.ShowTitle,
        FitContent = card.FitContent,
        CustomCss = card.CustomCss,
        DisplayMode = card.DisplayMode,
    };

    private static JsonElement? ParseJson(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try { return JsonDocument.Parse(json).RootElement; } catch { return null; }
    }
}
