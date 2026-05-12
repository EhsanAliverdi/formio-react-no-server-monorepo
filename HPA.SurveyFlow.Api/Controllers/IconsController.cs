using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace HPA.SurveyFlow.Api.Controllers;

[ApiController]
[Route("api/icons")]
public class IconsController(IWebHostEnvironment env) : ControllerBase
{
    private static readonly (string Id, string Label)[] IconPacks =
    [
        ("fa",  "Font Awesome"),
        ("md",  "Material Design Icons"),
        ("ai",  "Ant Design Icons"),
        ("bs",  "Bootstrap Icons"),
        ("bi",  "BoxIcons"),
        ("cg",  "css.gg"),
        ("di",  "Devicons"),
        ("fc",  "Flat Color Icons"),
        ("fi",  "Feather"),
        ("gi",  "Game Icons"),
        ("go",  "Github Octicons"),
        ("gr",  "Grommet Icons"),
        ("hi",  "Heroicons"),
        ("im",  "IcoMoon Free"),
        ("io",  "Ionicons 4"),
        ("io5", "Ionicons 5"),
        ("lu",  "Lucide"),
        ("pi",  "Phosphor Icons"),
        ("ri",  "Remix Icon"),
        ("rx",  "Radix Icons"),
        ("si",  "Simple Icons"),
        ("sl",  "Simple Line Icons"),
        ("tb",  "Tabler Icons"),
        ("ti",  "Typicons"),
        ("tfi", "Themify Icons"),
        ("vsc", "VS Code Icons"),
        ("wi",  "Weather Icons"),
        ("lia", "Line Awesome")
    ];

    private static readonly HashSet<string> ValidPackIds =
        new(IconPacks.Select(p => p.Id), StringComparer.OrdinalIgnoreCase);

    [HttpGet("packs")]
    public IActionResult GetPacks()
    {
        var items = IconPacks.Select(p => new { id = p.Id, label = p.Label }).ToList();
        return Ok(new { items });
    }

    [HttpGet("search")]
    public async Task<IActionResult> SearchIcons(
        [FromQuery] string? pack,
        [FromQuery] string? q,
        [FromQuery] int limit = 240)
    {
        if (string.IsNullOrWhiteSpace(pack))
            return BadRequest(new { error = "pack is required." });

        if (!ValidPackIds.Contains(pack))
            return BadRequest(new { error = $"Unknown pack '{pack}'." });

        limit = Math.Clamp(limit, 1, 500);

        var icons = await LoadIconNamesAsync(pack);

        if (!string.IsNullOrWhiteSpace(q))
        {
            var ql = q.ToLowerInvariant();
            icons = icons.Where(name => name.Contains(ql, StringComparison.OrdinalIgnoreCase)).ToList();
        }

        var items = icons.Take(limit).ToList();
        return Ok(new { items });
    }

    [HttpGet("svg")]
    public async Task<IActionResult> GetSvg(
        [FromQuery] string? pack,
        [FromQuery] string? name)
    {
        if (string.IsNullOrWhiteSpace(pack))
            return BadRequest(new { error = "pack is required." });
        if (string.IsNullOrWhiteSpace(name))
            return BadRequest(new { error = "name is required." });

        if (!ValidPackIds.Contains(pack))
            return BadRequest(new { error = $"Unknown pack '{pack}'." });

        var svgPath = await LoadIconSvgAsync(pack, name);
        if (svgPath == null)
            return NotFound(new { error = $"Icon '{name}' not found in pack '{pack}'." });

        // If the stored value is a full SVG string, return it directly
        // Otherwise wrap the path data in an SVG element
        string svgContent;
        if (svgPath.TrimStart().StartsWith("<svg", StringComparison.OrdinalIgnoreCase))
        {
            svgContent = svgPath;
        }
        else
        {
            svgContent = $"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="{svgPath}"/></svg>""";
        }

        Response.Headers.CacheControl = "public, max-age=31536000, immutable";
        return Content(svgContent, "image/svg+xml");
    }

    /// <summary>
    /// Loads icon names from icons/{pack}.json. The JSON can be either:
    /// - an array of strings (icon names)
    /// - an object (keys are icon names)
    /// Returns empty list if file not found or malformed.
    /// </summary>
    private async Task<List<string>> LoadIconNamesAsync(string pack)
    {
        var filePath = GetIconFilePath(pack);
        if (filePath == null || !System.IO.File.Exists(filePath))
            return [];

        try
        {
            var json = await System.IO.File.ReadAllTextAsync(filePath);
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (root.ValueKind == JsonValueKind.Array)
            {
                return root.EnumerateArray()
                    .Where(e => e.ValueKind == JsonValueKind.String)
                    .Select(e => e.GetString()!)
                    .Where(s => !string.IsNullOrEmpty(s))
                    .ToList();
            }

            if (root.ValueKind == JsonValueKind.Object)
            {
                return root.EnumerateObject()
                    .Select(p => p.Name)
                    .Where(n => !string.IsNullOrEmpty(n))
                    .ToList();
            }
        }
        catch
        {
            // malformed JSON — return empty
        }

        return [];
    }

    /// <summary>
    /// Loads the SVG path/content for a named icon from icons/{pack}.json.
    /// Expects the JSON file to be an object mapping name -> svg string or path string.
    /// Returns null if not found.
    /// </summary>
    private async Task<string?> LoadIconSvgAsync(string pack, string name)
    {
        var filePath = GetIconFilePath(pack);
        if (filePath == null || !System.IO.File.Exists(filePath))
            return null;

        try
        {
            var json = await System.IO.File.ReadAllTextAsync(filePath);
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (root.ValueKind == JsonValueKind.Object &&
                root.TryGetProperty(name, out var svgEl) &&
                svgEl.ValueKind == JsonValueKind.String)
            {
                return svgEl.GetString();
            }
        }
        catch
        {
            // malformed JSON — return null
        }

        return null;
    }

    private string? GetIconFilePath(string pack)
    {
        // Look in {ContentRootPath}/icons/{pack}.json
        var contentRoot = env.ContentRootPath;
        var path = Path.Combine(contentRoot, "icons", $"{pack}.json");
        return path;
    }
}
