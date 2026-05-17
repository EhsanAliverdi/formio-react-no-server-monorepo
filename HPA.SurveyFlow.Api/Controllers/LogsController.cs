using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using HPA.SurveyFlow.Api.Extensions;
using HPA.SurveyFlow.Domain.Enums;

namespace HPA.SurveyFlow.Api.Controllers;

/// <summary>
/// Serves structured log entries from the rolling JSON log file.
/// Admin-only. Reads the current day's file and parses each JSONL line.
/// </summary>
[ApiController]
[Route("api/admin/logs")]
public class LogsController(IConfiguration configuration) : ControllerBase
{
    // GET /api/admin/logs?level=Error&q=mex&limit=200&date=2026-05-14
    [HttpGet]
    public IActionResult GetLogs(
        [FromQuery] string? level = null,
        [FromQuery] string? q = null,
        [FromQuery] int limit = 200,
        [FromQuery] string? date = null)
    {
        try { HttpContext.RequireRole(UserRole.Admin); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        var logPath = ResolveLogPath(date);
        if (logPath is null || !System.IO.File.Exists(logPath))
            return Ok(new { items = Array.Empty<object>(), log_file = logPath ?? "not found" });

        var entries = ReadLogEntries(logPath, level, q, limit);
        return Ok(new { items = entries, log_file = System.IO.Path.GetFileName(logPath) });
    }

    // GET /api/admin/logs/files — list available log files
    [HttpGet("files")]
    public IActionResult GetFiles()
    {
        try { HttpContext.RequireRole(UserRole.Admin); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        var dir = GetLogDirectory();
        if (!System.IO.Directory.Exists(dir))
            return Ok(new { files = Array.Empty<object>() });

        var files = System.IO.Directory.GetFiles(dir, "app-*.jsonl")
            .OrderByDescending(f => f)
            .Take(14)
            .Select(f => new
            {
                name = System.IO.Path.GetFileName(f),
                date = System.IO.Path.GetFileNameWithoutExtension(f).Replace("app-", ""),
                size_bytes = new System.IO.FileInfo(f).Length,
            })
            .ToList();

        return Ok(new { files });
    }

    private string GetLogDirectory()
    {
        var configuredPath = configuration["Logging:path"] ?? "logs/app-.jsonl";
        var dir = System.IO.Path.GetDirectoryName(configuredPath) ?? "logs";
        // Resolve relative to content root
        if (!System.IO.Path.IsPathRooted(dir))
            dir = System.IO.Path.Combine(Directory.GetCurrentDirectory(), dir);
        return dir;
    }

    private string? ResolveLogPath(string? dateStr)
    {
        var dir = GetLogDirectory();
        if (!System.IO.Directory.Exists(dir)) return null;

        string datePart = dateStr ?? DateTime.UtcNow.ToString("yyyyMMdd");

        // Serilog file sink produces app-20260514.jsonl
        var path = System.IO.Path.Combine(dir, $"app-{datePart}.jsonl");
        if (System.IO.File.Exists(path)) return path;

        // Fallback: find latest file
        return System.IO.Directory.GetFiles(dir, "app-*.jsonl")
            .OrderByDescending(f => f)
            .FirstOrDefault();
    }

    private static List<object> ReadLogEntries(string path, string? level, string? q, int limit)
    {
        var entries = new List<object>();
        try
        {
            // Use FileShare.ReadWrite so we can read a file that Serilog has open
            using var fs = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
            using var reader = new StreamReader(fs);

            var lines = new List<string>();
            while (!reader.EndOfStream)
            {
                var line = reader.ReadLine();
                if (!string.IsNullOrWhiteSpace(line)) lines.Add(line);
            }

            // Read from the end so newest entries come first when we hit limit
            for (int i = lines.Count - 1; i >= 0 && entries.Count < limit; i--)
            {
                try
                {
                    using var doc = JsonDocument.Parse(lines[i]);
                    var root = doc.RootElement;

                    // Support both CLEF format (@t,@l,@m,@x) and legacy Serilog JSON format
                    var isCLEF = root.TryGetProperty("@t", out _);

                    string? entryLevel, rendered, timestamp, exception, correlationId;

                    if (isCLEF)
                    {
                        // CLEF (RenderedCompactJsonFormatter): @t=timestamp, @l=level, @m=rendered, @x=exception
                        // All properties are at root level (not nested under "Properties")
                        timestamp     = root.TryGetProperty("@t", out var t) ? t.GetString() : null;
                        entryLevel    = root.TryGetProperty("@l", out var l) ? l.GetString() : "Information";
                        rendered      = root.TryGetProperty("@m", out var m) ? m.GetString() : null;
                        exception     = root.TryGetProperty("@x", out var x) ? x.GetString() : null;
                        correlationId = root.TryGetProperty("CorrelationId", out var cid) ? cid.GetString() : null;
                    }
                    else
                    {
                        // Legacy JsonFormatter: Level, MessageTemplate, RenderedMessage, Timestamp, Properties.*
                        entryLevel    = root.TryGetProperty("Level", out var lvlEl) ? lvlEl.GetString() : null;
                        var template  = root.TryGetProperty("MessageTemplate", out var msgEl) ? msgEl.GetString() : null;
                        rendered      = root.TryGetProperty("RenderedMessage", out var rndEl) ? rndEl.GetString() : template;
                        timestamp     = root.TryGetProperty("Timestamp", out var tsEl) ? tsEl.GetString() : null;
                        exception     = root.TryGetProperty("Exception", out var exEl) ? exEl.GetString() : null;
                        correlationId = root.TryGetProperty("Properties", out var propsEl)
                            && propsEl.TryGetProperty("CorrelationId", out var cidEl)
                            ? cidEl.GetString() : null;
                    }

                    // Level filter
                    if (!string.IsNullOrWhiteSpace(level) &&
                        !string.Equals(entryLevel, level, StringComparison.OrdinalIgnoreCase))
                        continue;

                    // Text search
                    if (!string.IsNullOrWhiteSpace(q))
                    {
                        var searchIn = $"{rendered}{exception}{correlationId}".ToLowerInvariant();
                        if (!searchIn.Contains(q.ToLowerInvariant())) continue;
                    }

                    entries.Add(new
                    {
                        timestamp,
                        level = entryLevel,
                        message = rendered,
                        correlation_id = correlationId,
                        exception,
                        raw = lines[i].Length < 2000 ? lines[i] : lines[i][..2000] + "…",
                    });
                }
                catch { /* skip malformed lines */ }
            }
        }
        catch { /* file locked or missing — return empty */ }

        return entries;
    }
}
