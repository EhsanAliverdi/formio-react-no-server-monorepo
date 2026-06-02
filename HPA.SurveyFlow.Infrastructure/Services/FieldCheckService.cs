using System.Text.Json;
using HPA.SurveyFlow.Domain.DTOs.Requests;
using HPA.SurveyFlow.Domain.DTOs.Responses;
using HPA.SurveyFlow.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HPA.SurveyFlow.Infrastructure.Services;

/// <summary>
/// Checks whether a specific form field answer has already been reported (submitted) for
/// the same asset within a configurable time window, and what actions were taken on those
/// prior reports (MEX work orders raised, emails sent, etc.).
/// </summary>
public class FieldCheckService(AppDbContext db)
{
    private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web);

    public async Task<FieldCheckResultDto> CheckAsync(int formId, FieldCheckRequest request)
    {
        var hours = Math.Clamp(request.Hours ?? 24, 1, 720);
        var since = DateTime.UtcNow.AddHours(-hours);

        // Resolve machineId from request body — explicit field takes priority, then dig into Data bag
        var machineId = request.MachineId;
        if (string.IsNullOrWhiteSpace(machineId) && request.Data is not null)
        {
            if (request.Data.TryGetValue("machineId", out var mid) && mid is not null)
                machineId = mid.ToString();
        }

        // Only warn when the current answer actually matches the trigger value
        if (!string.Equals(request.FieldValue, request.TriggerValue, StringComparison.OrdinalIgnoreCase))
            return new FieldCheckResultDto { Valid = true, AlreadyReported = false };

        // Build base query — form, time window, not soft-deleted
        var query = db.FormSubmissions
            .AsNoTracking()
            .Where(s => s.FormId == formId
                     && s.SubmittedAt >= since
                     && s.DeletedAt == null);

        // Load candidates then filter in-memory on JSONB field value
        // (EF can't translate arbitrary JSONB key extraction without raw SQL — keep it simple)
        var candidates = await query
            .Select(s => new { s.Id, s.Data, s.SubmittedAt })
            .ToListAsync();

        var matchingIds = new List<int>();
        var matchingDates = new List<DateTime>();

        foreach (var c in candidates)
        {
            try
            {
                using var doc = JsonDocument.Parse(c.Data);
                var root = doc.RootElement;

                // Check that the triggering field matches
                if (!root.TryGetProperty(request.FieldKey, out var fieldProp)) continue;
                var fieldVal = fieldProp.ValueKind == JsonValueKind.String
                    ? fieldProp.GetString()
                    : fieldProp.GetRawText().Trim('"');

                if (!string.Equals(fieldVal, request.TriggerValue, StringComparison.OrdinalIgnoreCase))
                    continue;

                // Optionally scope to same machine
                if (!string.IsNullOrWhiteSpace(machineId))
                {
                    if (!root.TryGetProperty("machineId", out var midProp)) continue;
                    var midVal = midProp.ValueKind == JsonValueKind.String
                        ? midProp.GetString()
                        : midProp.GetRawText().Trim('"');
                    if (!string.Equals(midVal, machineId, StringComparison.OrdinalIgnoreCase))
                        continue;
                }

                matchingIds.Add(c.Id);
                matchingDates.Add(c.SubmittedAt);
            }
            catch { /* malformed JSON — skip */ }
        }

        if (matchingIds.Count == 0)
            return new FieldCheckResultDto { Valid = true, AlreadyReported = false };

        // Resolve machine display name
        string? machineName = null;
        if (!string.IsNullOrWhiteSpace(machineId))
        {
            var asset = await db.ExternalAssets
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.ExternalId == machineId);
            machineName = asset?.DisplayName;
        }

        // Load successful rule logs for all matching submissions, deduplicated by channel
        var ruleLogs = await db.SubmissionRuleLogs
            .AsNoTracking()
            .Where(l => matchingIds.Contains(l.SubmissionId) && l.Status == "success")
            .OrderByDescending(l => l.TriggeredAt)
            .ToListAsync();

        // Deduplicate: one entry per channel (keep the most recent)
        var actions = ruleLogs
            .GroupBy(l => l.Channel)
            .Select(g =>
            {
                var latest = g.First();
                string? reference = null;
                if (!string.IsNullOrWhiteSpace(latest.ResponseJson))
                {
                    try
                    {
                        using var doc = JsonDocument.Parse(latest.ResponseJson);
                        if (doc.RootElement.TryGetProperty("requestNumber", out var refProp))
                            reference = refProp.GetString();
                    }
                    catch { }
                }

                return new FieldCheckActionDto
                {
                    Type = latest.RuleType,
                    Channel = latest.Channel,
                    Label = FriendlyLabel(latest.Channel, latest.RuleName),
                    Reference = reference,
                    TriggeredAt = latest.TriggeredAt,
                };
            })
            .OrderBy(a => a.Channel)
            .ToList();

        var summary = new FieldCheckSummaryDto
        {
            ReportCount = matchingIds.Count,
            FirstReportedAt = matchingDates.Min(),
            LastReportedAt = matchingDates.Max(),
        };

        var message = BuildMessage(summary, actions, machineName, hours);

        return new FieldCheckResultDto
        {
            Valid = false,
            AlreadyReported = true,
            MachineName = machineName,
            Summary = summary,
            ActionsTaken = actions,
            Message = message,
        };
    }

    private static string FriendlyLabel(string channel, string ruleName) => channel switch
    {
        "mex"     => "Work order raised in MEX",
        "email"   => $"Operations team notified via email ({ruleName})",
        "webhook" => $"External system notified ({ruleName})",
        _         => ruleName,
    };

    private static string BuildMessage(
        FieldCheckSummaryDto summary,
        List<FieldCheckActionDto> actions,
        string? machineName,
        int hours)
    {
        var who = machineName is not null ? $" on {machineName}" : string.Empty;
        var count = summary.ReportCount == 1 ? "once" : $"{summary.ReportCount} times";
        var window = hours == 24 ? "in the last 24 hours" : $"in the last {hours} hours";

        var sb = new System.Text.StringBuilder();
        sb.Append($"This issue has been reported {count}{who} {window}.");

        if (actions.Count > 0)
        {
            sb.Append(" Actions already taken: ");
            var parts = new List<string>();

            foreach (var a in actions)
            {
                var part = a.Channel switch
                {
                    "mex"     => a.Reference is not null ? $"MEX work order raised (ref: {a.Reference})" : "MEX work order raised",
                    "email"   => "Operations team notified via email",
                    "webhook" => "External system notified",
                    _         => a.Label,
                };
                parts.Add(part);
            }

            sb.Append(string.Join(", ", parts));
            sb.Append('.');
        }

        sb.Append(" Do you still want to submit this report?");
        return sb.ToString();
    }
}
