using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HPA.SurveyFlow.Api.Extensions;
using HPA.SurveyFlow.Domain.DTOs.Requests;
using HPA.SurveyFlow.Domain.Entities;
using HPA.SurveyFlow.Domain.Enums;
using HPA.SurveyFlow.Infrastructure.Data;

namespace HPA.SurveyFlow.Api.Controllers;

[ApiController]
[Route("api/categories")]
public class CategoriesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List()
    {
        var categories = await db.Categories.OrderBy(c => c.Name).ToListAsync();

        // Count forms referencing each slug via the JSON column
        var allForms = await db.Forms.Select(f => new { f.Json }).ToListAsync();

        var formCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var f in allForms)
        {
            try
            {
                using var doc = System.Text.Json.JsonDocument.Parse(f.Json);
                if (doc.RootElement.TryGetProperty("appSettings", out var app)
                    && app.TryGetProperty("categorySlug", out var slugEl)
                    && slugEl.ValueKind == System.Text.Json.JsonValueKind.String)
                {
                    var slug = slugEl.GetString()?.Trim();
                    if (!string.IsNullOrEmpty(slug))
                        formCounts[slug] = formCounts.GetValueOrDefault(slug) + 1;
                }
            }
            catch { }
        }

        return Ok(categories.Select(c => ToDto(c, formCounts.GetValueOrDefault(c.Slug))));
    }

    [HttpGet("{slug}")]
    public async Task<IActionResult> Get(string slug)
    {
        var category = await db.Categories.FirstOrDefaultAsync(c => c.Slug == slug);
        if (category == null) return NotFound(new { error = "Category not found." });
        return Ok(ToDto(category, null));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCategoryRequest body)
    {
        try { HttpContext.RequireRole(UserRole.Admin, UserRole.Editor); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        if (string.IsNullOrWhiteSpace(body.Slug))
            return BadRequest(new { error = "Slug is required." });
        if (string.IsNullOrWhiteSpace(body.Name))
            return BadRequest(new { error = "Name is required." });

        var slug = body.Slug.Trim().ToLowerInvariant().Replace(' ', '-');
        if (await db.Categories.AnyAsync(c => c.Slug == slug))
            return Conflict(new { error = $"A category with slug \"{slug}\" already exists." });

        var category = new Category
        {
            Slug = slug,
            Name = body.Name.Trim(),
            Description = body.Description?.Trim(),
            Visibility = body.Visibility == "restricted" ? "restricted" : "public",
            ImageUrl = body.ImageUrl?.Trim(),
            ShowCategoryImage = body.ShowCategoryImage,
            IconKey = body.IconKey?.Trim(),
            LayoutMode = body.LayoutMode is "list" ? "list" : "card",
            PageSize = Math.Clamp(body.PageSize, 1, 100),
            ShowTitle = body.ShowTitle,
            ShowDescription = body.ShowDescription,
            ShowButton = body.ShowButton,
            ButtonText = body.ButtonText?.Trim(),
            Columns = Math.Clamp(body.Columns, 1, 4),
            CardStyle = body.CardStyle is "compact" ? "compact" : "overlay",
        };

        db.Categories.Add(category);
        await db.SaveChangesAsync();
        return Ok(new { success = true, id = category.Id, slug = category.Slug });
    }

    [HttpPut("{slug}")]
    public async Task<IActionResult> Update(string slug, [FromBody] UpdateCategoryRequest body)
    {
        try { HttpContext.RequireRole(UserRole.Admin, UserRole.Editor); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        var category = await db.Categories.FirstOrDefaultAsync(c => c.Slug == slug);
        if (category == null) return NotFound(new { error = "Category not found." });

        if (body.Name != null) category.Name = body.Name.Trim();
        if (body.Description != null) category.Description = body.Description.Trim() == "" ? null : body.Description.Trim();
        if (body.Visibility != null) category.Visibility = body.Visibility == "restricted" ? "restricted" : "public";
        if (body.ImageUrl != null) category.ImageUrl = body.ImageUrl.Trim() == "" ? null : body.ImageUrl.Trim();
        if (body.ShowCategoryImage.HasValue) category.ShowCategoryImage = body.ShowCategoryImage.Value;
        if (body.IconKey != null) category.IconKey = body.IconKey.Trim() == "" ? null : body.IconKey.Trim();
        if (body.LayoutMode != null) category.LayoutMode = body.LayoutMode is "list" ? "list" : "card";
        if (body.PageSize.HasValue) category.PageSize = Math.Clamp(body.PageSize.Value, 1, 100);
        if (body.ShowTitle.HasValue) category.ShowTitle = body.ShowTitle.Value;
        if (body.ShowDescription.HasValue) category.ShowDescription = body.ShowDescription.Value;
        if (body.ShowButton.HasValue) category.ShowButton = body.ShowButton.Value;
        if (body.ButtonText != null) category.ButtonText = body.ButtonText.Trim() == "" ? null : body.ButtonText.Trim();
        if (body.Columns.HasValue) category.Columns = Math.Clamp(body.Columns.Value, 1, 4);
        if (body.CardStyle != null) category.CardStyle = body.CardStyle is "compact" ? "compact" : "overlay";
        category.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpDelete("{slug}")]
    public async Task<IActionResult> Delete(string slug)
    {
        try { HttpContext.RequireRole(UserRole.Admin); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        var category = await db.Categories.FirstOrDefaultAsync(c => c.Slug == slug);
        if (category == null) return NotFound(new { error = "Category not found." });

        // Guard: reject if any forms still reference this slug
        var allForms = await db.Forms.Select(f => new { f.Json }).ToListAsync();
        var inUse = allForms.Any(f =>
        {
            try
            {
                using var doc = System.Text.Json.JsonDocument.Parse(f.Json);
                if (doc.RootElement.TryGetProperty("appSettings", out var app)
                    && app.TryGetProperty("categorySlug", out var slugEl)
                    && slugEl.ValueKind == System.Text.Json.JsonValueKind.String)
                    return string.Equals(slugEl.GetString()?.Trim(), slug, StringComparison.OrdinalIgnoreCase);
            }
            catch { }
            return false;
        });

        if (inUse)
            return Conflict(new { error = "This category is still assigned to one or more forms. Remove those assignments before deleting." });

        db.Categories.Remove(category);
        await db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    private static object ToDto(Category c, int? formCount) => new
    {
        id = c.Id,
        slug = c.Slug,
        name = c.Name,
        description = c.Description,
        visibility = c.Visibility,
        image_url = c.ImageUrl,
        show_category_image = c.ShowCategoryImage,
        icon_key = c.IconKey,
        layout_mode = c.LayoutMode,
        page_size = c.PageSize,
        show_title = c.ShowTitle,
        show_description = c.ShowDescription,
        show_button = c.ShowButton,
        button_text = c.ButtonText,
        columns = c.Columns,
        card_style = c.CardStyle,
        form_count = formCount ?? 0,
        created_at = c.CreatedAt,
        updated_at = c.UpdatedAt,
    };
}
