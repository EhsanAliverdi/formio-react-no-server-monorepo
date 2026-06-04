using System.Text.Json;
using HPA.SurveyFlow.Domain.DTOs.Requests;
using HPA.SurveyFlow.Domain.DTOs.Responses;
using HPA.SurveyFlow.Domain.Entities;
using HPA.SurveyFlow.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HPA.SurveyFlow.Infrastructure.Services;

public class IntegrationActivityReportService(AppDbContext db)
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public async Task<ReportExecutionResultDto> ExecuteAsync(ReportTemplate template, RunReportRequest request)
    {
        var rows = await db.SubmissionRuleLogs
            .AsNoTracking()
            .Include(l => l.Submission).ThenInclude(s => s.Form)
            .Where(l => l.Submission.DeletedAt == null)
            .ToListAsync();

        var terminalCode = string.IsNullOrWhiteSpace(template.TerminalCode)
            ? Normalise(request.TerminalCode)
            : template.TerminalCode;

        if (!string.IsNullOrWhiteSpace(terminalCode))
            rows = rows.Where(l => l.Submission.TerminalCode == terminalCode).ToList();

        var filter = ParseCondition(template.FiltersJson);
        var runtimeFilter = request.RuntimeFilters.HasValue ? ParseCondition(request.RuntimeFilters.Value.GetRawText()) : null;
        rows = rows.Where(l => Matches(l, filter) && Matches(l, runtimeFilter)).ToList();

        var groupBy = ParseList<GroupByDef>(template.GroupByJson);
        var measures = ParseList<MeasureDef>(template.MeasuresJson);
        if (groupBy.Count > 0 || measures.Count > 0)
            return BuildAggregateResult(rows, groupBy, measures, request);

        var columns = ParseList<ReportColumnDefinitionDto>(template.ColumnsJson);
        if (columns.Count == 0)
            columns = DefaultColumns();

        var orderedRows = rows
            .OrderByDescending(l => l.TriggeredAt)
            .Skip((Math.Max(request.Page, 1) - 1) * Math.Clamp(request.PageSize, 1, 200))
            .Take(Math.Clamp(request.PageSize, 1, 200))
            .Select(l => BuildRow(l, columns))
            .ToList();

        return new ReportExecutionResultDto
        {
            Columns = columns,
            Rows = orderedRows,
            Total = rows.Count,
            Page = Math.Max(request.Page, 1),
            PageSize = Math.Clamp(request.PageSize, 1, 200),
        };
    }

    public static List<FieldDescriptorDto> Fields() =>
    [
        new() { Key = "triggered_at", Label = "Triggered At", Type = "date" },
        new() { Key = "completed_at", Label = "Completed At", Type = "date" },
        new() { Key = "time_window", Label = "Time Window", Type = "select", Options =
        [
            new() { Value = "last_24h", Label = "Last 24 hours" },
            new() { Value = "last_7d", Label = "Last 7 days" },
            new() { Value = "last_30d", Label = "Last 30 days" },
            new() { Value = "last_365d", Label = "Last 12 months" },
        ]},
        new() { Key = "rule_type", Label = "Rule Type", Type = "select", Options =
        [
            new() { Value = "integration", Label = "Integration" },
            new() { Value = "notification", Label = "Notification" },
        ]},
        new() { Key = "channel", Label = "Channel", Type = "select", Options =
        [
            new() { Value = "mex", Label = "MEX" },
            new() { Value = "email", Label = "Email" },
            new() { Value = "sms", Label = "SMS" },
            new() { Value = "webhook", Label = "Webhook" },
        ]},
        new() { Key = "action", Label = "Action", Type = "text" },
        new() { Key = "status", Label = "Status", Type = "select", Options =
        [
            new() { Value = "pending", Label = "Pending" },
            new() { Value = "success", Label = "Success" },
            new() { Value = "failed", Label = "Failed" },
        ]},
        new() { Key = "rule_name", Label = "Rule Name", Type = "text" },
        new() { Key = "form_name", Label = "Form", Type = "text" },
        new() { Key = "terminal_code", Label = "Terminal", Type = "text" },
        new() { Key = "submission_id", Label = "Submission ID", Type = "number" },
        new() { Key = "status_code", Label = "Status Code", Type = "number" },
        new() { Key = "integration_ref", Label = "Integration Reference", Type = "text" },
    ];

    private static ReportExecutionResultDto BuildAggregateResult(List<SubmissionRuleLog> logs, List<GroupByDef> groupBy, List<MeasureDef> measures, RunReportRequest request)
    {
        if (measures.Count == 0)
            measures.Add(new MeasureDef(null, "Count", "count", "count", null));

        var grouped = logs
            .GroupBy(l => string.Join("||", groupBy.Select(g => GroupValue(l, g))))
            .Select(g =>
            {
                var row = new Dictionary<string, object?>();
                var first = g.FirstOrDefault();
                foreach (var def in groupBy)
                    row[def.Alias] = first == null ? string.Empty : GroupValue(first, def);
                foreach (var measure in measures)
                    row[measure.Alias] = g.Count();
                return row;
            })
            .OrderBy(r => groupBy.Count > 0 ? Convert.ToString(r[groupBy[0].Alias]) : string.Empty)
            .ToList();

        var pageSize = Math.Clamp(request.PageSize, 1, 200);
        var page = Math.Max(request.Page, 1);
        var columns = groupBy
            .Select(g => new ReportColumnDefinitionDto { FieldKey = g.Alias, Label = g.Label })
            .Concat(measures.Select(m => new ReportColumnDefinitionDto { FieldKey = m.Alias, Label = m.Label }))
            .ToList();

        return new ReportExecutionResultDto
        {
            Columns = columns,
            Rows = grouped.Skip((page - 1) * pageSize).Take(pageSize).ToList(),
            Total = grouped.Count,
            Page = page,
            PageSize = pageSize,
        };
    }

    private static string GroupValue(SubmissionRuleLog log, GroupByDef def)
    {
        if (def.FieldKey == "triggered_at")
            return DateBucket(log.TriggeredAt, def.DateTrunc);
        if (def.FieldKey == "completed_at")
            return log.CompletedAt.HasValue ? DateBucket(log.CompletedAt.Value, def.DateTrunc) : string.Empty;
        return ValueFor(log, def.FieldKey)?.ToString() ?? string.Empty;
    }

    private static string DateBucket(DateTime value, string? dateTrunc) => (dateTrunc ?? "day") switch
    {
        "hour" => value.ToString("yyyy-MM-dd HH:00"),
        "week" => value.AddDays(-(int)value.DayOfWeek).ToString("yyyy-MM-dd"),
        "month" => value.ToString("yyyy-MM"),
        "quarter" => $"{value.Year}-Q{((value.Month - 1) / 3) + 1}",
        "year" => value.ToString("yyyy"),
        _ => value.ToString("yyyy-MM-dd"),
    };

    private static Dictionary<string, object?> BuildRow(SubmissionRuleLog log, List<ReportColumnDefinitionDto> columns)
    {
        var row = new Dictionary<string, object?>();
        foreach (var column in columns)
            row[column.FieldKey] = ValueFor(log, column.FieldKey);
        return row;
    }

    private static object? ValueFor(SubmissionRuleLog log, string key) => key switch
    {
        "triggered_at" => log.TriggeredAt.ToString("O"),
        "completed_at" => log.CompletedAt?.ToString("O"),
        "rule_type" => log.RuleType,
        "channel" => log.Channel,
        "action" => log.Action,
        "status" => log.Status,
        "rule_name" => log.RuleName,
        "form_name" => log.Submission.Form.Name,
        "terminal_code" => log.Submission.TerminalCode ?? "All",
        "submission_id" => log.SubmissionId,
        "status_code" => log.StatusCode,
        "integration_ref" => ExtractIntegrationRef(log.ResponseJson),
        _ => null,
    };

    private static bool Matches(SubmissionRuleLog log, ConditionNode? node)
    {
        if (node == null) return true;
        if (node.Children is { Count: > 0 })
        {
            var isOr = string.Equals(node.Operator, "OR", StringComparison.OrdinalIgnoreCase);
            return isOr ? node.Children.Any(child => Matches(log, child)) : node.Children.All(child => Matches(log, child));
        }

        if (string.IsNullOrWhiteSpace(node.FieldKey)) return true;
        if (node.FieldKey == "time_window")
            return MatchesTimeWindow(log.TriggeredAt, node.Value?.ToString());

        var raw = ValueFor(log, node.FieldKey)?.ToString() ?? string.Empty;
        var expected = node.Value?.ToString() ?? string.Empty;
        return (node.ConditionOperator ?? "equals").ToLowerInvariant() switch
        {
            "contains" => raw.Contains(expected, StringComparison.OrdinalIgnoreCase),
            "not_equals" => !string.Equals(raw, expected, StringComparison.OrdinalIgnoreCase),
            "is_empty" => string.IsNullOrWhiteSpace(raw),
            "is_not_empty" => !string.IsNullOrWhiteSpace(raw),
            _ => string.Equals(raw, expected, StringComparison.OrdinalIgnoreCase),
        };
    }

    private static bool MatchesTimeWindow(DateTime triggeredAt, string? value)
    {
        var cutoff = (value ?? string.Empty).ToLowerInvariant() switch
        {
            "last_24h" => DateTime.UtcNow.AddHours(-24),
            "last_7d" => DateTime.UtcNow.AddDays(-7),
            "last_30d" => DateTime.UtcNow.AddDays(-30),
            "last_365d" => DateTime.UtcNow.AddDays(-365),
            _ => DateTime.MinValue,
        };
        return triggeredAt >= cutoff;
    }

    private static string? ExtractIntegrationRef(string? responseJson)
    {
        if (string.IsNullOrWhiteSpace(responseJson)) return null;
        try
        {
            using var doc = JsonDocument.Parse(responseJson);
            if (TryExtractRequestNumber(doc.RootElement, out var requestNumber))
                return requestNumber;

            if (doc.RootElement.TryGetProperty("body", out var bodyEl)
                || (doc.RootElement.TryGetProperty("result", out var result) && result.TryGetProperty("body", out bodyEl)))
            {
                var body = bodyEl.ValueKind == JsonValueKind.String ? bodyEl.GetString() : bodyEl.GetRawText();
                if (!string.IsNullOrWhiteSpace(body))
                {
                    using var bodyDoc = JsonDocument.Parse(body);
                    if (TryExtractRequestNumber(bodyDoc.RootElement, out requestNumber))
                        return requestNumber;
                }
            }
        }
        catch { }
        return null;
    }

    private static bool TryExtractRequestNumber(JsonElement root, out string? requestNumber)
    {
        requestNumber = null;
        if (!root.TryGetProperty("requestNumber", out var value)
            && !root.TryGetProperty("RequestNumber", out value))
            return false;

        requestNumber = value.ValueKind == JsonValueKind.String ? value.GetString() : value.GetRawText();
        return !string.IsNullOrWhiteSpace(requestNumber);
    }

    private static List<ReportColumnDefinitionDto> DefaultColumns() =>
    [
        new() { FieldKey = "triggered_at", Label = "Triggered At" },
        new() { FieldKey = "channel", Label = "Channel" },
        new() { FieldKey = "action", Label = "Action" },
        new() { FieldKey = "status", Label = "Status" },
        new() { FieldKey = "form_name", Label = "Form" },
        new() { FieldKey = "integration_ref", Label = "Reference" },
    ];

    private static ConditionNode? ParseCondition(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try { return JsonSerializer.Deserialize<ConditionNode>(json, JsonOptions); }
        catch { return null; }
    }

    private static List<T> ParseList<T>(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try { return JsonSerializer.Deserialize<List<T>>(json, JsonOptions) ?? []; }
        catch { return []; }
    }

    private static string? Normalise(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim().ToUpperInvariant();

    private sealed class ConditionNode
    {
        public string? Operator { get; set; }
        public List<ConditionNode>? Children { get; set; }
        public string? FieldKey { get; set; }
        public string? ConditionOperator { get; set; }
        public object? Value { get; set; }
    }

    private sealed record GroupByDef(
        [property: System.Text.Json.Serialization.JsonPropertyName("field_key")] string FieldKey,
        [property: System.Text.Json.Serialization.JsonPropertyName("label")] string Label,
        [property: System.Text.Json.Serialization.JsonPropertyName("alias")] string Alias,
        [property: System.Text.Json.Serialization.JsonPropertyName("date_trunc")] string? DateTrunc);

    private sealed record MeasureDef(
        [property: System.Text.Json.Serialization.JsonPropertyName("field_key")] string? FieldKey,
        [property: System.Text.Json.Serialization.JsonPropertyName("label")] string Label,
        [property: System.Text.Json.Serialization.JsonPropertyName("aggregation")] string Aggregation,
        [property: System.Text.Json.Serialization.JsonPropertyName("alias")] string? AliasValue,
        [property: System.Text.Json.Serialization.JsonPropertyName("format")] string? Format)
    {
        public string Alias => string.IsNullOrWhiteSpace(AliasValue) ? "count" : AliasValue;
    }
}
