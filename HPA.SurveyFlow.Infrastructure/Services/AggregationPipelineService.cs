using System.Data.Common;
using System.Text;
using System.Text.Json;
using HPA.SurveyFlow.Domain.DTOs.Requests;
using HPA.SurveyFlow.Domain.DTOs.Responses;
using HPA.SurveyFlow.Domain.Entities;
using HPA.SurveyFlow.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HPA.SurveyFlow.Infrastructure.Services;

/// <summary>
/// Executes GROUP BY aggregation queries against form_submissions.
///
/// Supports:
///   - Arbitrary GROUP BY dimensions (raw field values or date-truncated)
///   - Aggregation functions: count, sum, avg, min, max
///   - Synthetic "_count" measure (COUNT(*) available on every template)
///   - Date truncation granularities: day, week, month, quarter, year
///   - Same WHERE-clause pipeline as ReportQueryEngineService (template filters + runtime filters + RLS)
///   - Pagination and sort
/// </summary>
public class AggregationPipelineService(AppDbContext db)
{
    private static readonly System.Text.RegularExpressions.Regex SafeKeyRegex =
        new(@"^[a-zA-Z0-9_.\-]+$", System.Text.RegularExpressions.RegexOptions.Compiled);

    // ── Public entry point ───────────────────────────────────────────────────

    public async Task<ReportExecutionResultDto> ExecuteAsync(
        ReportTemplate template,
        RunReportRequest request,
        string? rlsClause = null)
    {
        var groupByDefs = DeserializeGroupBy(template.GroupByJson);
        var measureDefs = DeserializeMeasures(template.MeasuresJson);

        if (groupByDefs.Count == 0 && measureDefs.Count == 0)
            return EmptyResult(request);

        // Ensure at least _count is present if no explicit measures
        if (measureDefs.Count == 0)
            measureDefs.Add(new MeasureDef("_count", "Count", "count", null, null));

        var parameters = new List<object>();
        var baseWhere = BuildBaseWhere(template.FormId, ResolveTerminalCode(template, request), template.FiltersJson, request.RuntimeFilters, parameters);
        var fullWhere = rlsClause != null ? $"({baseWhere}) AND {rlsClause}" : baseWhere;

        var selectParts = BuildSelectParts(groupByDefs, measureDefs);
        var groupByParts = BuildGroupByParts(groupByDefs);
        var orderBy = BuildOrderBy(request.SortField, request.SortDirection, groupByDefs, measureDefs);

        var pageSize = Math.Clamp(request.PageSize > 0 ? request.PageSize : template.DefaultPageSize, 1, 200);
        var page = Math.Max(request.Page, 1);
        var offset = (page - 1) * pageSize;

        var hasMachineId = groupByDefs.Any(g => g.FieldKey == "machineId");
        var assetJoin = hasMachineId
            ? "LEFT JOIN external_assets ea ON ea.source = 'mex' AND ea.external_id = data::jsonb->>'machineId'"
            : string.Empty;

        var countSql = groupByParts.Count > 0
            ? $"SELECT COUNT(*) FROM (SELECT 1 FROM form_submissions {assetJoin} WHERE {fullWhere} GROUP BY {string.Join(", ", groupByParts)}) _agg"
            : $"SELECT COUNT(*) FROM form_submissions WHERE {fullWhere}";

        var dataSql = new StringBuilder();
        dataSql.Append($"SELECT {selectParts} FROM form_submissions {assetJoin} WHERE {fullWhere}");
        if (groupByParts.Count > 0) dataSql.Append($" GROUP BY {string.Join(", ", groupByParts)}");
        dataSql.Append($" ORDER BY {orderBy} LIMIT {pageSize} OFFSET {offset}");

        var conn = db.Database.GetDbConnection();
        var wasOpen = conn.State == System.Data.ConnectionState.Open;
        if (!wasOpen) await conn.OpenAsync();
        try
        {
            var total = await ExecuteCountAsync(countSql.ToString(), parameters, conn);
            var rows = await ExecuteRowsAsync(dataSql.ToString(), parameters, groupByDefs, measureDefs, conn);
            var columns = BuildColumnDefs(groupByDefs, measureDefs);
            return new ReportExecutionResultDto
            {
                Columns = columns,
                Rows = rows,
                Total = total,
                Page = page,
                PageSize = pageSize,
            };
        }
        finally
        {
            if (!wasOpen) await conn.CloseAsync();
        }
    }

    // ── SQL builders ─────────────────────────────────────────────────────────

    private static string BuildSelectParts(List<GroupByDef> groups, List<MeasureDef> measures)
    {
        var parts = new List<string>();

        foreach (var g in groups)
            parts.Add($"{DateTruncExpr(g)} AS \"{g.Alias}\"");

        foreach (var m in measures)
        {
            if (m.FieldKey == "_count" || m.Aggregation == "count")
            {
                parts.Add($"COUNT(*) AS \"{m.Alias}\"");
            }
            else if (m.Aggregation.StartsWith("count_where_eq:", StringComparison.OrdinalIgnoreCase))
            {
                // count_where_eq:value — COUNT(*) FILTER (WHERE field = 'value')
                var filterValue = m.Aggregation["count_where_eq:".Length..].Replace("'", "''");
                parts.Add($"COUNT(*) FILTER (WHERE data::jsonb->>'{EscapeKey(m.FieldKey!)}' = '{filterValue}') AS \"{m.Alias}\"");
            }
            else
            {
                parts.Add($"{m.Aggregation.ToUpperInvariant()}(NULLIF(data::jsonb->>'{EscapeKey(m.FieldKey!)}', '')::numeric) AS \"{m.Alias}\"");
            }
        }

        return string.Join(", ", parts);
    }

    private static List<string> BuildGroupByParts(List<GroupByDef> groups) =>
        groups.Select(g => DateTruncExpr(g)).ToList();

    private static string DateTruncExpr(GroupByDef g)
    {
        // machineId resolves to the asset display name via LEFT JOIN on external_assets
        var raw = g.FieldKey == "machineId"
            ? $"COALESCE(ea.display_name, data::jsonb->>'machineId')"
            : $"data::jsonb->>'{EscapeKey(g.FieldKey)}'";
        return g.DateTrunc switch
        {
            "day"     => $"TO_CHAR(({raw})::date, 'YYYY-MM-DD')",
            "week"    => $"TO_CHAR(DATE_TRUNC('week', ({raw})::date), 'YYYY-MM-DD')",
            "month"   => $"TO_CHAR(DATE_TRUNC('month', ({raw})::date), 'YYYY-MM') ",
            "quarter" => $"TO_CHAR(DATE_TRUNC('quarter', ({raw})::date), 'YYYY-\"Q\"Q')",
            "year"    => $"TO_CHAR(DATE_TRUNC('year', ({raw})::date), 'YYYY')",
            _         => raw,
        };
    }

    private static string BuildOrderBy(string? sortField, string? sortDirection,
        List<GroupByDef> groups, List<MeasureDef> measures)
    {
        var dir = sortDirection?.Equals("desc", StringComparison.OrdinalIgnoreCase) == true ? "DESC" : "ASC";
        if (!string.IsNullOrWhiteSpace(sortField))
        {
            // Match by alias for safety
            var allAliases = groups.Select(g => g.Alias).Concat(measures.Select(m => m.Alias)).ToHashSet();
            if (allAliases.Contains(sortField))
                return $"\"{sortField}\" {dir}";
        }
        // Default: first dimension or first measure
        if (groups.Count > 0) return $"\"{groups[0].Alias}\" {dir}";
        if (measures.Count > 0) return $"\"{measures[0].Alias}\" {dir}";
        return "1 ASC";
    }

    private static string BuildBaseWhere(int formId, string? terminalCode, string? templateFiltersJson,
        JsonElement? runtimeFilters, List<object> parameters)
    {
        // Delegate to the same filter builder used by ReportQueryEngineService via static helpers
        parameters.Add(formId);
        var paramIdx = parameters.Count; // 1-based
        var baseSql = $"form_id = ${paramIdx} AND deleted_at IS NULL";

        if (!string.IsNullOrWhiteSpace(terminalCode))
        {
            parameters.Add(terminalCode);
            baseSql += $" AND terminal_code = ${parameters.Count}";
        }

        // Apply template filters
        if (!string.IsNullOrWhiteSpace(templateFiltersJson))
        {
            try
            {
                var group = JsonSerializer.Deserialize<ConditionGroupDef>(templateFiltersJson);
                if (group?.Children?.Count > 0)
                {
                    var clause = BuildConditionGroup(group, parameters);
                    if (!string.IsNullOrWhiteSpace(clause))
                        baseSql += $" AND ({clause})";
                }
            }
            catch { }
        }

        // Apply runtime filters
        if (runtimeFilters.HasValue && runtimeFilters.Value.ValueKind == JsonValueKind.Object)
        {
            try
            {
                var group = JsonSerializer.Deserialize<ConditionGroupDef>(runtimeFilters.Value.GetRawText());
                if (group?.Children?.Count > 0)
                {
                    var clause = BuildConditionGroup(group, parameters);
                    if (!string.IsNullOrWhiteSpace(clause))
                        baseSql += $" AND ({clause})";
                }
            }
            catch { }
        }

        return baseSql;
    }

    private static string? ResolveTerminalCode(ReportTemplate template, RunReportRequest request) =>
        string.IsNullOrWhiteSpace(template.TerminalCode)
            ? NormaliseTerminalCode(request.TerminalCode)
            : template.TerminalCode;

    private static string? NormaliseTerminalCode(string? terminalCode) =>
        string.IsNullOrWhiteSpace(terminalCode) ? null : terminalCode.Trim().ToUpperInvariant();

    private static string BuildConditionGroup(ConditionGroupDef group, List<object> parameters)
    {
        var parts = new List<string>();
        foreach (var child in group.Children ?? [])
        {
            if (child.Children != null)
            {
                var nested = BuildConditionGroup(child, parameters);
                if (!string.IsNullOrWhiteSpace(nested)) parts.Add($"({nested})");
                continue;
            }
            if (string.IsNullOrWhiteSpace(child.FieldKey) || !SafeKeyRegex.IsMatch(child.FieldKey)) continue;
            var fieldExpr = $"data::jsonb->>'{child.FieldKey}'";
            parameters.Add(child.Value ?? string.Empty);
            var p = $"${parameters.Count}";
            var clause = child.ConditionOperator?.ToLowerInvariant() switch
            {
                "equals"       => $"{fieldExpr} = {p}",
                "not_equals"   => $"{fieldExpr} != {p}",
                "contains"     => $"{fieldExpr} ILIKE '%' || {p} || '%'",
                "starts_with"  => $"{fieldExpr} ILIKE {p} || '%'",
                "ends_with"    => $"{fieldExpr} ILIKE '%' || {p}",
                "gt"           => $"({fieldExpr})::numeric > ({p})::numeric",
                "gte"          => $"({fieldExpr})::numeric >= ({p})::numeric",
                "lt"           => $"({fieldExpr})::numeric < ({p})::numeric",
                "lte"          => $"({fieldExpr})::numeric <= ({p})::numeric",
                _ => null,
            };
            if (clause != null) parts.Add(clause);
            else parameters.RemoveAt(parameters.Count - 1); // remove unused param
        }
        var op = group.Operator?.ToUpperInvariant() == "OR" ? " OR " : " AND ";
        return string.Join(op, parts);
    }

    // ── Data readers ─────────────────────────────────────────────────────────

    private static async Task<int> ExecuteCountAsync(string sql, List<object> parameters, DbConnection conn)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        for (var i = 0; i < parameters.Count; i++)
        {
            var p = cmd.CreateParameter();
            p.Value = parameters[i];
            cmd.Parameters.Add(p);
        }
        var result = await cmd.ExecuteScalarAsync();
        return result is long l ? (int)l : result is int i2 ? i2 : 0;
    }

    private static async Task<List<Dictionary<string, object?>>> ExecuteRowsAsync(
        string sql, List<object> parameters,
        List<GroupByDef> groups, List<MeasureDef> measures,
        DbConnection conn)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        for (var i = 0; i < parameters.Count; i++)
        {
            var p = cmd.CreateParameter();
            p.Value = parameters[i];
            cmd.Parameters.Add(p);
        }

        var rows = new List<Dictionary<string, object?>>();
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var row = new Dictionary<string, object?>();
            foreach (var g in groups)
                row[g.Alias] = reader.IsDBNull(reader.GetOrdinal(g.Alias)) ? null : reader.GetValue(reader.GetOrdinal(g.Alias))?.ToString();
            foreach (var m in measures)
                row[m.Alias] = reader.IsDBNull(reader.GetOrdinal(m.Alias)) ? null : reader.GetValue(reader.GetOrdinal(m.Alias))?.ToString();
            rows.Add(row);
        }
        return rows;
    }

    private static List<ReportColumnDefinitionDto> BuildColumnDefs(List<GroupByDef> groups, List<MeasureDef> measures)
    {
        var cols = new List<ReportColumnDefinitionDto>();
        cols.AddRange(groups.Select(g => new ReportColumnDefinitionDto { FieldKey = g.Alias, Label = g.Label }));
        cols.AddRange(measures.Select(m => new ReportColumnDefinitionDto { FieldKey = m.Alias, Label = m.Label }));
        return cols;
    }

    private static ReportExecutionResultDto EmptyResult(RunReportRequest request) =>
        new() { Columns = [], Rows = [], Total = 0, Page = request.Page, PageSize = request.PageSize };

    // ── Deserialisers ─────────────────────────────────────────────────────────

    private static List<GroupByDef> DeserializeGroupBy(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try { return JsonSerializer.Deserialize<List<GroupByDef>>(json) ?? []; }
        catch { return []; }
    }

    private static List<MeasureDef> DeserializeMeasures(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try { return JsonSerializer.Deserialize<List<MeasureDef>>(json) ?? []; }
        catch { return []; }
    }

    private static string EscapeKey(string key) =>
        key.Replace("'", "''").Replace("\\", "");

    // ── Local POCOs ───────────────────────────────────────────────────────────

    private record GroupByDef(
        [property: System.Text.Json.Serialization.JsonPropertyName("field_key")] string FieldKey,
        [property: System.Text.Json.Serialization.JsonPropertyName("label")]     string Label,
        [property: System.Text.Json.Serialization.JsonPropertyName("alias")]     string Alias,
        [property: System.Text.Json.Serialization.JsonPropertyName("date_trunc")]string? DateTrunc);

    private record MeasureDef(
        [property: System.Text.Json.Serialization.JsonPropertyName("field_key")]   string? FieldKey,
        [property: System.Text.Json.Serialization.JsonPropertyName("label")]       string Label,
        [property: System.Text.Json.Serialization.JsonPropertyName("aggregation")] string Aggregation,
        [property: System.Text.Json.Serialization.JsonPropertyName("alias")]       string? _alias,
        [property: System.Text.Json.Serialization.JsonPropertyName("format")]      string? Format)
    {
        public string Alias => _alias ?? (FieldKey != null ? $"{Aggregation}_{FieldKey}" : Aggregation);
    }

    private class ConditionGroupDef
    {
        [System.Text.Json.Serialization.JsonPropertyName("operator")]   public string? Operator { get; set; }
        [System.Text.Json.Serialization.JsonPropertyName("children")]   public List<ConditionGroupDef>? Children { get; set; }
        [System.Text.Json.Serialization.JsonPropertyName("field_key")]  public string? FieldKey { get; set; }
        [System.Text.Json.Serialization.JsonPropertyName("condition_operator")] public string? ConditionOperator { get; set; }
        [System.Text.Json.Serialization.JsonPropertyName("value")]      public string? Value { get; set; }
    }
}
