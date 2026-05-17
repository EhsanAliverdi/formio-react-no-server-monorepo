using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HPA.SurveyFlow.Infrastructure.Data;

namespace HPA.SurveyFlow.Api.Controllers;

/// <summary>
/// Serves dynamic dropdown data for Formio select fields.
///
/// Formio calls this endpoint directly via the URL stored in the form schema:
///   dataSrc: "url"
///   url: "/api/data-sources/query/mex?category=Pumps"
///
/// The sourceKey is the integration source name (e.g. "mex").
/// All filtering is done via standard query parameters in the URL.
/// No DataSourceDefinition lookup needed — the URL is the config.
/// </summary>
[ApiController]
[Route("api/data-sources")]
public class DataSourceController(AppDbContext db) : ControllerBase
{
    // GET /api/data-sources/query/{source}
    //   ?q=pump        — user's search text (Formio appends this via searchField)
    //   &category=X    — filter by category (set once in form builder URL)
    //   &location=X    — filter by location (set once in form builder URL)
    //   &active=true   — only active assets (default true)
    //   &limit=300     — max results
    [HttpGet("query/{source}")]
    public async Task<IActionResult> Query(
        string source,
        [FromQuery] string? q        = null,
        [FromQuery] string? category = null,
        [FromQuery] string? location = null,
        [FromQuery] bool    active   = true,
        [FromQuery] int     limit    = 300)
    {
        var query = db.ExternalAssets.Where(a => a.Source == source);

        if (active)
            query = query.Where(a => a.IsActive);

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(a => a.Category == category);

        if (!string.IsNullOrWhiteSpace(location))
            query = query.Where(a => a.Location == location);

        if (!string.IsNullOrWhiteSpace(q))
        {
            var ql = q.ToLower();
            query = query.Where(a =>
                a.DisplayName.ToLower().Contains(ql) ||
                a.ExternalId.ToLower().Contains(ql) ||
                (a.Category != null && a.Category.ToLower().Contains(ql)));
        }

        var items = await query
            .OrderBy(a => a.DisplayName)
            .Take(limit)
            .Select(a => new { value = a.ExternalId, label = a.DisplayName })
            .ToListAsync();

        return Ok(items);
    }

    // Legacy endpoint — kept for backwards compatibility
    [HttpGet("assets")]
    public Task<IActionResult> GetAssets(
        [FromQuery] string source   = "mex",
        [FromQuery] string? q       = null,
        [FromQuery] string? category = null,
        [FromQuery] string? location = null,
        [FromQuery] bool    active   = true,
        [FromQuery] int     limit    = 300)
        => Query(source, q, category, location, active, limit);
}
