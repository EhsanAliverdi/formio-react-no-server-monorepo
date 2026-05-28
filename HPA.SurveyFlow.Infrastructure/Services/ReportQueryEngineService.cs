using System.Security;
using System.Text;
using System.Text.Json;
using HPA.SurveyFlow.Domain.DTOs.Requests;
using HPA.SurveyFlow.Domain.DTOs.Responses;
using HPA.SurveyFlow.Domain.Entities;
using HPA.SurveyFlow.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HPA.SurveyFlow.Infrastructure.Services;

/// <summary>
/// Translates a ReportTemplate + runtime request into a parameterised PostgreSQL query
/// against form_submissions, using JSONB operators for field extraction and filtering.
/// </summary>
public class ReportQueryEngineService(AppDbContext db)
{
    private static readonly System.Text.RegularExpressions.Regex SafeKeyRegex =
        new(@"^[a-zA-Z0-9_.\-]+$", System.Text.RegularExpressions.RegexOptions.Compiled);

    public async Task<ReportExecutionResultDto> ExecuteAsync(ReportTemplate template, RunReportRequest request)
    {
        var columns = DeserializeColumns(template.ColumnsJson);
        if (columns.Count == 0)
            return new ReportExecutionResultDto { Columns = [], Rows = [], Total = 0, Page = request.Page, PageSize = request.PageSize };

        // Merge template filters (AND) with runtime filters
        var mergedFilters = MergeFilters(template.FiltersJson, request.RuntimeFilters);

        // Build WHERE predicates
        var parameters = new List<object>();
        var whereClause = BuildWhereClause(template.FormId, mergedFilters, parameters);

        // Resolve sort
        var sortField = NormaliseSortField(request.SortField ?? template.DefaultSortField, columns);
        var sortDir = (request.SortDirection ?? template.DefaultSortDirection ?? "asc")
            .Equals("desc", StringComparison.OrdinalIgnoreCase) ? "DESC" : "ASC";

        var pageSize = Math.Clamp(request.PageSize > 0 ? request.PageSize : template.DefaultPageSize, 1, 200);
        var page = Math.Max(request.Page, 1);
        var offset = (page - 1) * pageSize;

        // Build SELECT list — extract each column from data JSONB
        var selectParts = BuildSelectParts(columns);

        var conn = db.Database.GetDbConnection();
        var wasOpen = conn.State == System.Data.ConnectionState.Open;
        if (!wasOpen) await conn.OpenAsync();
        try
        {
        // Count query
        var countSql = $"SELECT COUNT(*) FROM form_submissions WHERE {whereClause}";
        var total = await ExecuteCountAsync(countSql, parameters, conn);

        // Data query
        var orderBy = sortField != null
            ? $"data::jsonb->>'{EscapeKey(sortField)}' {sortDir}"
            : "submitted_at DESC";

        var dataSql = $@"
SELECT {selectParts}, submitted_at, id as submission_id
FROM form_submissions
WHERE {whereClause}
ORDER BY {orderBy}
LIMIT {pageSize} OFFSET {offset}";

        var rows = await ExecuteRowsAsync(dataSql, parameters, columns, conn);

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

    private static List<ReportColumnDefinitionDto> DeserializeColumns(string columnsJson)
    {
        try
        {
            // Parse raw JSON and normalise field_key / fieldKey variance from stored data
            using var doc = JsonDocument.Parse(columnsJson);
            var result = new List<ReportColumnDefinitionDto>();
            foreach (var el in doc.RootElement.EnumerateArray())
            {
                var fieldKey = el.TryGetProperty("field_key", out var fk) ? fk.GetString()
                             : el.TryGetProperty("fieldKey", out var fk2) ? fk2.GetString()
                             : null;
                var label = el.TryGetProperty("label", out var lbl) ? lbl.GetString() : null;
                int? width = el.TryGetProperty("width", out var w) && w.ValueKind == JsonValueKind.Number ? w.GetInt32() : null;
                var format = el.TryGetProperty("format", out var fmt) ? fmt.GetString() : null;

                if (string.IsNullOrWhiteSpace(fieldKey)) continue;
                result.Add(new ReportColumnDefinitionDto
                {
                    FieldKey = fieldKey,
                    Label = label ?? fieldKey,
                    Width = width,
                    Format = format,
                });
            }
            return result;
        }
        catch { return []; }
    }

    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private static string? NormaliseSortField(string? field, List<ReportColumnDefinitionDto> columns)
    {
        if (string.IsNullOrWhiteSpace(field)) return null;
        return columns.Any(c => c.FieldKey == field) && SafeKeyRegex.IsMatch(field) ? field : null;
    }

    private static string BuildSelectParts(List<ReportColumnDefinitionDto> columns)
    {
        var parts = columns.Select(c =>
        {
            var key = EscapeKey(c.FieldKey);
            if (c.FieldKey.Contains('.'))
            {
                var segments = c.FieldKey.Split('.');
                var path = $"data::jsonb->'{EscapeKey(segments[0])}'->0->>'{EscapeKey(segments[1])}'";
                return $"{path} AS \"{EscapeKey(c.FieldKey)}\"";
            }
            return $"data::jsonb->>'{key}' AS \"{key}\"";
        });
        return string.Join(", ", parts);
    }

    private string BuildWhereClause(int formId, ConditionNode? filters, List<object> parameters)
    {
        // Parameter index starts after @p0 (formId)
        parameters.Add(formId);
        var baseWhere = "form_id = {0} AND deleted_at IS NULL";

        if (filters == null || (filters.Children == null && string.IsNullOrEmpty(filters.FieldKey)))
            return string.Format(baseWhere, "@p0");

        var sb = new StringBuilder();
        sb.Append("form_id = @p0 AND deleted_at IS NULL AND (");
        BuildNodeSql(filters, sb, parameters);
        sb.Append(')');
        return sb.ToString();
    }

    private void BuildNodeSql(ConditionNode node, StringBuilder sb, List<object> parameters)
    {
        if (node.Children != null && node.Children.Count > 0)
        {
            var op = (node.Operator ?? "AND").ToUpperInvariant() == "OR" ? " OR " : " AND ";
            sb.Append('(');
            for (var i = 0; i < node.Children.Count; i++)
            {
                if (i > 0) sb.Append(op);
                BuildNodeSql(node.Children[i], sb, parameters);
            }
            sb.Append(')');
            return;
        }

        if (string.IsNullOrWhiteSpace(node.FieldKey) || !SafeKeyRegex.IsMatch(node.FieldKey))
        {
            sb.Append("TRUE");
            return;
        }

        var key = EscapeKey(node.FieldKey);
        var fieldExpr = node.FieldKey.Contains('.')
            ? $"data::jsonb->'{EscapeKey(node.FieldKey.Split('.')[0])}'->0->>'{EscapeKey(node.FieldKey.Split('.')[1])}'"
            : $"data::jsonb->>'{key}'";

        var condOp = (node.ConditionOperator ?? "equals").ToLowerInvariant();
        var pIdx = parameters.Count;

        switch (condOp)
        {
            case "is_empty":
                sb.Append($"({fieldExpr} IS NULL OR {fieldExpr} = '')");
                break;
            case "is_not_empty":
                sb.Append($"({fieldExpr} IS NOT NULL AND {fieldExpr} <> '')");
                break;
            case "equals":
                parameters.Add(node.Value?.ToString() ?? string.Empty);
                sb.Append($"LOWER({fieldExpr}) = LOWER(@p{pIdx})");
                break;
            case "not_equals":
                parameters.Add(node.Value?.ToString() ?? string.Empty);
                sb.Append($"(LOWER({fieldExpr}) <> LOWER(@p{pIdx}) OR {fieldExpr} IS NULL)");
                break;
            case "contains":
                parameters.Add($"%{node.Value?.ToString() ?? string.Empty}%");
                sb.Append($"LOWER({fieldExpr}) LIKE LOWER(@p{pIdx})");
                break;
            case "greater_than":
                parameters.Add(node.Value?.ToString() ?? "0");
                sb.Append($"({fieldExpr})::numeric > (@p{pIdx})::numeric");
                break;
            case "less_than":
                parameters.Add(node.Value?.ToString() ?? "0");
                sb.Append($"({fieldExpr})::numeric < (@p{pIdx})::numeric");
                break;
            case "greater_than_or_equal":
                parameters.Add(node.Value?.ToString() ?? "0");
                sb.Append($"({fieldExpr})::numeric >= (@p{pIdx})::numeric");
                break;
            case "less_than_or_equal":
                parameters.Add(node.Value?.ToString() ?? "0");
                sb.Append($"({fieldExpr})::numeric <= (@p{pIdx})::numeric");
                break;
            default:
                sb.Append("TRUE");
                break;
        }
    }

    private static async Task<int> ExecuteCountAsync(string sql, List<object> parameters, System.Data.Common.DbConnection conn)
    {
        var npgsqlSql = ReplacePlaceholders(sql);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = npgsqlSql;
        AddParameters(cmd, parameters);
        var result = await cmd.ExecuteScalarAsync();
        return Convert.ToInt32(result);
    }

    private static async Task<List<Dictionary<string, object?>>> ExecuteRowsAsync(
        string sql, List<object> parameters, List<ReportColumnDefinitionDto> columns, System.Data.Common.DbConnection conn)
    {
        var npgsqlSql = ReplacePlaceholders(sql);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = npgsqlSql;
        AddParameters(cmd, parameters);

        var rows = new List<Dictionary<string, object?>>();
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var row = new Dictionary<string, object?>();
            foreach (var col in columns)
            {
                var escapedKey = EscapeKey(col.FieldKey);
                try
                {
                    var ordinal = reader.GetOrdinal(escapedKey);
                    row[col.FieldKey] = reader.IsDBNull(ordinal) ? null : reader.GetValue(ordinal)?.ToString();
                }
                catch
                {
                    row[col.FieldKey] = null;
                }
            }
            try { row["_id"] = reader.GetValue(reader.GetOrdinal("submission_id")); } catch { }
            try { row["_submitted_at"] = reader.GetValue(reader.GetOrdinal("submitted_at"))?.ToString(); } catch { }
            rows.Add(row);
        }
        return rows;
    }

    private static string ReplacePlaceholders(string sql)
    {
        // Replace @p0, @p1... with $1, $2...
        return System.Text.RegularExpressions.Regex.Replace(sql, @"@p(\d+)", m =>
            $"${int.Parse(m.Groups[1].Value) + 1}");
    }

    private static void AddParameters(System.Data.IDbCommand cmd, List<object> parameters)
    {
        // Npgsql positional parameters: SQL uses $1, $2... and parameters are added in order with no name
        foreach (var value in parameters)
        {
            var p = cmd.CreateParameter();
            p.Value = value ?? DBNull.Value;
            cmd.Parameters.Add(p);
        }
    }

    private static string EscapeKey(string key)
    {
        // Only allow safe characters to prevent SQL injection via field keys
        return SafeKeyRegex.IsMatch(key) ? key : throw new SecurityException($"Unsafe field key: {key}");
    }

    private static ConditionNode? MergeFilters(string? templateFiltersJson, JsonElement? runtimeFilters)
    {
        var templateNode = ParseConditionNode(templateFiltersJson);
        var runtimeNode = runtimeFilters.HasValue ? ParseConditionNodeFromElement(runtimeFilters.Value) : null;

        if (templateNode == null && runtimeNode == null) return null;
        if (templateNode == null) return runtimeNode;
        if (runtimeNode == null) return templateNode;

        return new ConditionNode
        {
            Operator = "AND",
            Children = [templateNode, runtimeNode],
        };
    }

    private static ConditionNode? ParseConditionNode(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try { return JsonSerializer.Deserialize<ConditionNode>(json, JsonOptions); }
        catch { return null; }
    }

    private static ConditionNode? ParseConditionNodeFromElement(JsonElement el)
    {
        if (el.ValueKind == JsonValueKind.Null || el.ValueKind == JsonValueKind.Undefined) return null;
        try { return JsonSerializer.Deserialize<ConditionNode>(el.GetRawText(), JsonOptions); }
        catch { return null; }
    }

    // Internal model matching the JSON condition structure from the frontend
    private class ConditionNode
    {
        public string? Operator { get; set; }
        public List<ConditionNode>? Children { get; set; }
        public string? FieldKey { get; set; }
        public string? ConditionOperator { get; set; }
        public object? Value { get; set; }
    }
}
