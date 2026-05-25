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
    //   &parentId=X    — filter by parent external id
    //   &active=true   — only active assets (default true)
    //   &limit=300     — max results
    [HttpGet("query/{source}")]
    public async Task<IActionResult> Query(
        string source,
        [FromQuery] string? q        = null,
        [FromQuery] string? category = null,
        [FromQuery] string? location = null,
        [FromQuery] string? parentId = null,
        [FromQuery] bool    active   = true,
        [FromQuery] int     limit    = 300,
        [FromQuery] string? valueField = null)
    {
        var query = db.ExternalAssets.Where(a => a.Source == source);

        if (active)
            query = query.Where(a => a.IsActive);

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(a => a.Category == category);

        if (!string.IsNullOrWhiteSpace(location))
            query = query.Where(a => a.Location == location);

        if (!string.IsNullOrWhiteSpace(parentId))
            query = query.Where(a => a.ParentExternalId == parentId);

        if (!string.IsNullOrWhiteSpace(q))
        {
            var ql = q.ToLower();
            query = query.Where(a =>
                a.DisplayName.ToLower().Contains(ql) ||
                a.ExternalId.ToLower().Contains(ql) ||
                (a.RawJson != null && a.RawJson.ToLower().Contains(ql)) ||
                (a.Category != null && a.Category.ToLower().Contains(ql)));
        }

        var assets = await query
            .OrderBy(a => a.DisplayName)
            .Take(limit)
            .Select(a => new { a.Id, a.ExternalId, a.DisplayName, a.RawJson })
            .ToListAsync();

        var items = assets.Select(a =>
        {
            var rawValue = ResolveOptionValue(a.Id, a.ExternalId, a.RawJson, valueField);
            var assetNumber = ReadRawString(a.RawJson, "assetNumber", "AssetNumber");
            var description = ReadRawString(a.RawJson, "assetDescription", "AssetDescription");
            var labelParts = new[] { assetNumber, a.ExternalId, a.DisplayName, description }
                .Where(v => !string.IsNullOrWhiteSpace(v))
                .Distinct(StringComparer.OrdinalIgnoreCase);

            return new
            {
                value = string.IsNullOrWhiteSpace(rawValue) ? a.ExternalId : rawValue,
                label = string.Join(" - ", labelParts),
                id = a.Id,
                external_id = a.ExternalId,
                externalId = a.ExternalId,
                assetNumber,
                assetDescription = description,
            };
        }).ToList();

        return Ok(items);
    }

    // Legacy endpoint — kept for backwards compatibility
    [HttpGet("assets")]
    public Task<IActionResult> GetAssets(
        [FromQuery] string source   = "mex",
        [FromQuery] string? q       = null,
        [FromQuery] string? category = null,
        [FromQuery] string? location = null,
        [FromQuery] string? parentId = null,
        [FromQuery] bool    active   = true,
        [FromQuery] int     limit    = 300,
        [FromQuery] string? valueField = null)
        => Query(source, q, category, location, parentId, active, limit, valueField);

    private static string? ResolveOptionValue(int id, string externalId, string? rawJson, string? valueField)
    {
        if (string.IsNullOrWhiteSpace(valueField))
            return externalId;

        return valueField switch
        {
            "id" or "localId" => id.ToString(),
            "externalId" or "external_id" or "assetId" => externalId,
            _ => ReadRawString(rawJson, valueField),
        };
    }

    private static string? ReadRawString(string? rawJson, params string?[] keys)
    {
        if (string.IsNullOrWhiteSpace(rawJson))
            return null;

        try
        {
            using var doc = System.Text.Json.JsonDocument.Parse(rawJson);
            if (doc.RootElement.ValueKind != System.Text.Json.JsonValueKind.Object)
                return null;

            foreach (var key in keys.Where(k => !string.IsNullOrWhiteSpace(k)))
            {
                if (doc.RootElement.TryGetProperty(key!, out var value))
                    return value.ValueKind == System.Text.Json.JsonValueKind.String
                        ? value.GetString()
                        : value.ToString();
            }
        }
        catch { }

        return null;
    }
}
