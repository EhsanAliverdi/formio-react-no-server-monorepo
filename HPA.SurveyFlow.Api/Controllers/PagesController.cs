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
[Route("api/pages")]
public class PagesController(AppDbContext db, AuditService auditService) : ControllerBase
{
    [HttpGet]
    [RequirePermission(Permissions.Pages.Read)]
    public async Task<IActionResult> List([FromQuery] bool paged = false, [FromQuery] int limit = 25, [FromQuery] int offset = 0)
    {
        limit = Math.Clamp(limit, 1, 200);
        offset = Math.Max(0, offset);
        var query = db.Pages.OrderBy(p => p.Title);
        if (paged)
        {
            var total = await query.CountAsync();
            var items = await query.Skip(offset).Take(limit).ToListAsync();
            return Ok(new { items = items.Select(MapDto), total, limit, offset });
        }

        var pages = await query.ToListAsync();
        return Ok(pages.Select(MapDto));
    }

    [HttpGet("{id:int}")]
    [RequirePermission(Permissions.Pages.Read)]
    public async Task<IActionResult> Get(int id)
    {
        var page = await db.Pages.FindAsync(id);
        return page == null
            ? NotFound(new { error = "Page not found." })
            : Ok(MapDto(page));
    }

    [HttpGet("by-slug/{slug}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetBySlug(string slug)
    {
        var page = await db.Pages.FirstOrDefaultAsync(p => p.Slug == slug && p.IsActive);
        if (page == null) return NotFound(new { error = "Page not found." });
        if (page.Visibility != "public" && HttpContext.GetCurrentUser() == null)
            return Unauthorized(new { error = "Sign in to view this page." });
        return Ok(MapDto(page));
    }

    [HttpPost]
    [RequirePermission(Permissions.Pages.Manage)]
    public async Task<IActionResult> Create([FromBody] SavePageRequest body)
    {
        var user = HttpContext.GetCurrentUser();
        if (user == null) return Unauthorized();

        var slug = NormaliseSlug(body.Slug);
        var validation = await ValidatePage(body.Title, slug, body.Visibility);
        if (validation != null) return validation;

        var page = new Page { CreatedByUserId = user.Id };
        ApplyPage(page, body, slug);
        db.Pages.Add(page);
        await db.SaveChangesAsync();
        await auditService.LogAsync(
            user.Id,
            user.Email,
            "created",
            "Page",
            page.Id.ToString(),
            page.Title,
            before: null,
            after: MapDto(page),
            ipAddress: ClientIp());
        return CreatedAtAction(nameof(Get), new { id = page.Id }, MapDto(page));
    }

    [HttpPut("{id:int}")]
    [RequirePermission(Permissions.Pages.Manage)]
    public async Task<IActionResult> Update(int id, [FromBody] SavePageRequest body)
    {
        var page = await db.Pages.FindAsync(id);
        if (page == null) return NotFound(new { error = "Page not found." });
        var user = HttpContext.GetCurrentUser();
        if (user == null) return Unauthorized();
        var before = MapDto(page);

        var slug = NormaliseSlug(body.Slug);
        var validation = await ValidatePage(body.Title, slug, body.Visibility, id);
        if (validation != null) return validation;

        ApplyPage(page, body, slug);
        page.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await auditService.LogAsync(
            user.Id,
            user.Email,
            "updated",
            "Page",
            page.Id.ToString(),
            page.Title,
            before,
            MapDto(page),
            ClientIp());
        return Ok(MapDto(page));
    }

    [HttpPost("{id:int}/duplicate")]
    [RequirePermission(Permissions.Pages.Manage)]
    public async Task<IActionResult> Duplicate(int id)
    {
        var source = await db.Pages.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id);
        if (source == null) return NotFound(new { error = "Page not found." });
        var user = HttpContext.GetCurrentUser();
        if (user == null) return Unauthorized();

        var copyTitle = await NextCopyName(
            source.Title,
            title => db.Pages.AnyAsync(p => p.Title == title));
        var copySlug = await NextCopySlug(source.Slug, slug => db.Pages.AnyAsync(p => p.Slug == slug));

        var page = new Page
        {
            Title = copyTitle,
            Slug = copySlug,
            Description = source.Description,
            Visibility = source.Visibility,
            IsActive = source.IsActive,
            UseLayout = source.UseLayout,
            ProjectJson = source.ProjectJson,
            Html = source.Html,
            Css = source.Css,
            CreatedByUserId = user.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        db.Pages.Add(page);
        await db.SaveChangesAsync();
        await auditService.LogAsync(
            user.Id,
            user.Email,
            "duplicated",
            "Page",
            page.Id.ToString(),
            page.Title,
            before: MapDto(source),
            after: MapDto(page),
            ipAddress: ClientIp());
        return CreatedAtAction(nameof(Get), new { id = page.Id }, MapDto(page));
    }

    [HttpDelete("{id:int}")]
    [RequirePermission(Permissions.Pages.Manage)]
    public async Task<IActionResult> Delete(int id)
    {
        var page = await db.Pages.FindAsync(id);
        if (page == null) return NotFound(new { error = "Page not found." });
        var user = HttpContext.GetCurrentUser();
        if (user == null) return Unauthorized();
        var before = MapDto(page);
        db.Pages.Remove(page);
        await db.SaveChangesAsync();
        await auditService.LogAsync(
            user.Id,
            user.Email,
            "deleted",
            "Page",
            id.ToString(),
            before.Title,
            before,
            after: null,
            ipAddress: ClientIp());
        return NoContent();
    }

    private async Task<IActionResult?> ValidatePage(string title, string slug, string visibility, int? currentId = null)
    {
        if (string.IsNullOrWhiteSpace(title)) return BadRequest(new { error = "Page title is required." });
        if (string.IsNullOrWhiteSpace(slug)) return BadRequest(new { error = "Page slug is required." });
        if (visibility is not ("public" or "restricted")) return BadRequest(new { error = "Page visibility must be public or restricted." });
        if (await db.Pages.AnyAsync(p => p.Slug == slug && p.Id != currentId))
            return Conflict(new { error = "Page slug already exists." });
        return null;
    }

    private static void ApplyPage(Page page, SavePageRequest body, string slug)
    {
        page.Title = body.Title.Trim();
        page.Slug = slug;
        page.Description = body.Description?.Trim();
        page.Visibility = body.Visibility;
        page.IsActive = body.IsActive;
        page.UseLayout = body.UseLayout;
        page.ProjectJson = string.IsNullOrWhiteSpace(body.ProjectJson) ? "{}" : body.ProjectJson;
        page.Html = body.Html ?? string.Empty;
        page.Css = body.Css ?? string.Empty;
    }

    private static string NormaliseSlug(string value) =>
        Regex.Replace(value.Trim().ToLowerInvariant(), @"[^a-z0-9]+", "-").Trim('-');

    private static async Task<string> NextCopyName(string originalName, Func<string, Task<bool>> exists)
    {
        var baseName = $"Copy of {originalName}".Trim();
        var candidate = baseName;
        var suffix = 2;
        while (await exists(candidate))
            candidate = $"{baseName} {suffix++}";
        return candidate;
    }

    private static async Task<string> NextCopySlug(string originalSlug, Func<string, Task<bool>> exists)
    {
        var baseSlug = NormaliseSlug($"copy-of-{originalSlug}");
        var candidate = baseSlug;
        var suffix = 2;
        while (await exists(candidate))
            candidate = $"{baseSlug}-{suffix++}";
        return candidate;
    }

    private static PageDto MapDto(Page page) => new()
    {
        Id = page.Id,
        Title = page.Title,
        Slug = page.Slug,
        Description = page.Description,
        Visibility = page.Visibility,
        IsActive = page.IsActive,
        UseLayout = page.UseLayout,
        ProjectJson = page.ProjectJson,
        Html = page.Html,
        Css = page.Css,
        CreatedByUserId = page.CreatedByUserId,
        CreatedAt = page.CreatedAt,
        UpdatedAt = page.UpdatedAt,
    };

    private string? ClientIp() => HttpContext.Connection.RemoteIpAddress?.ToString();
}
