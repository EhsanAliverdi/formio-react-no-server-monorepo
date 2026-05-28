using System.Text.Json;
using HPA.SurveyFlow.Domain.DTOs.Responses;

namespace HPA.SurveyFlow.Infrastructure.Services;

/// <summary>
/// Walks a Form.io JSON schema and produces a flat list of reportable field descriptors.
/// Handles all standard container types including panels, tabs, columns, fieldsets,
/// datagrids, editgrids, tables, containers, and surveys.
/// Conditional fields are included but flagged as conditional.
/// </summary>
public class FormSchemaResolverService
{
    private static readonly HashSet<string> SkipTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "button", "htmlelement", "content", "signature", "file",
    };

    public IReadOnlyList<FieldDescriptorDto> ResolveFields(string formJson)
    {
        var result = new List<FieldDescriptorDto>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        try
        {
            using var doc = JsonDocument.Parse(formJson);
            var root = doc.RootElement;
            if (root.TryGetProperty("components", out var components))
                WalkComponents(components, prefix: null, result, seen);
        }
        catch { }
        return result;
    }

    private void WalkComponents(
        JsonElement components,
        string? prefix,
        List<FieldDescriptorDto> result,
        HashSet<string> seen)
    {
        if (components.ValueKind != JsonValueKind.Array) return;

        foreach (var component in components.EnumerateArray())
        {
            if (!component.TryGetProperty("type", out var typeProp)) continue;
            var type = typeProp.GetString() ?? string.Empty;
            if (SkipTypes.Contains(type)) continue;

            var key = component.TryGetProperty("key", out var kp) ? kp.GetString() ?? "" : "";
            var label = component.TryGetProperty("label", out var lp) ? lp.GetString() ?? key : key;
            var fullKey = prefix != null && !string.IsNullOrEmpty(key) ? $"{prefix}.{key}" : key;

            var ltype = type.ToLowerInvariant();

            // ── Container: recurse with key as prefix ─────────────────────
            if (ltype == "container")
            {
                if (component.TryGetProperty("components", out var cc))
                    WalkComponents(cc, fullKey, result, seen);
                continue;
            }

            // ── Tabs: each tab panel has its own components array ──────────
            if (ltype is "tabs" or "tabscomponent")
            {
                if (component.TryGetProperty("components", out var tabPanels))
                    foreach (var tab in tabPanels.EnumerateArray())
                        if (tab.TryGetProperty("components", out var tc))
                            WalkComponents(tc, prefix, result, seen);
                continue;
            }

            // ── Datagrid / EditGrid: children prefixed with grid key ───────
            if (ltype is "datagrid" or "editgrid")
            {
                if (!string.IsNullOrEmpty(key) && component.TryGetProperty("components", out var gc))
                    WalkComponents(gc, fullKey, result, seen);
                continue;
            }

            // ── Columns layout: each column has components ─────────────────
            if (ltype == "columns")
            {
                if (component.TryGetProperty("columns", out var cols))
                    foreach (var col in cols.EnumerateArray())
                        if (col.TryGetProperty("components", out var colc))
                            WalkComponents(colc, prefix, result, seen);
                continue;
            }

            // ── Table layout: rows → columns → components ─────────────────
            if (ltype == "table")
            {
                if (component.TryGetProperty("rows", out var rows))
                    foreach (var row in rows.EnumerateArray())
                        if (row.ValueKind == JsonValueKind.Array)
                            foreach (var cell in row.EnumerateArray())
                                if (cell.TryGetProperty("components", out var cellc))
                                    WalkComponents(cellc, prefix, result, seen);
                continue;
            }

            // ── Generic containers (panel, fieldset, well, form) ──────────
            if (ltype is "panel" or "fieldset" or "well" or "form")
            {
                if (component.TryGetProperty("components", out var children))
                    WalkComponents(children, prefix, result, seen);
                continue;
            }

            // ── Survey: each row becomes a dimension ──────────────────────
            if (ltype == "survey")
            {
                if (component.TryGetProperty("questions", out var questions))
                    foreach (var q in questions.EnumerateArray())
                    {
                        var qval = q.TryGetProperty("value", out var qv) ? qv.GetString() ?? "" : "";
                        var qlbl = q.TryGetProperty("label", out var ql) ? ql.GetString() ?? qval : qval;
                        if (string.IsNullOrEmpty(qval)) continue;
                        var qKey = $"{fullKey}.{qval}";
                        if (seen.Add(qKey))
                            result.Add(new FieldDescriptorDto
                            {
                                Key = qKey,
                                Label = $"{label}: {qlbl}",
                                Type = "select",
                                Options = ExtractSurveyValues(component),
                                IsConditional = IsConditional(component),
                            });
                    }
                continue;
            }

            // ── Leaf field ────────────────────────────────────────────────
            if (string.IsNullOrEmpty(key)) continue;
            if (!seen.Add(fullKey)) continue;

            result.Add(new FieldDescriptorDto
            {
                Key = fullKey,
                Label = string.IsNullOrWhiteSpace(label) ? fullKey : label,
                Type = MapFieldType(ltype),
                Options = ExtractOptions(component, ltype),
                IsConditional = IsConditional(component),
            });
        }
    }

    private static string MapFieldType(string ltype) => ltype switch
    {
        "number" or "currency" => "number",
        "checkbox" => "boolean",
        "datetime" or "day" => "date",
        "select" or "radio" or "selectboxes" => "select",
        _ => "text",
    };

    private static bool IsConditional(JsonElement component)
    {
        // Form.io conditional: { show: true/false, when: ..., eq: ... }
        if (component.TryGetProperty("conditional", out var cond))
        {
            if (cond.TryGetProperty("when", out var when) && when.ValueKind != JsonValueKind.Null
                && !string.IsNullOrEmpty(when.GetString()))
                return true;
            if (cond.TryGetProperty("json", out var json) && json.ValueKind != JsonValueKind.Null
                && json.ValueKind != JsonValueKind.String)
                return true;
        }
        // Advanced conditions
        if (component.TryGetProperty("customConditional", out var cc)
            && cc.ValueKind == JsonValueKind.String
            && !string.IsNullOrWhiteSpace(cc.GetString()))
            return true;
        return false;
    }

    private static List<FieldOptionDto>? ExtractOptions(JsonElement component, string ltype)
    {
        // selectboxes has values array directly on component
        if (ltype == "selectboxes")
            return ExtractValuesArray(component);

        // select/radio: options under data.values (static) or component.values
        if (component.TryGetProperty("data", out var data) && data.TryGetProperty("values", out var dv))
        {
            var opts = ParseValueLabelArray(dv);
            if (opts != null) return opts;
        }

        if (component.TryGetProperty("values", out var vals))
        {
            var opts = ParseValueLabelArray(vals);
            if (opts != null) return opts;
        }

        return null;
    }

    private static List<FieldOptionDto>? ExtractValuesArray(JsonElement component)
    {
        if (!component.TryGetProperty("values", out var vals)) return null;
        return ParseValueLabelArray(vals);
    }

    private static List<FieldOptionDto>? ExtractSurveyValues(JsonElement component)
    {
        if (!component.TryGetProperty("values", out var vals)) return null;
        return ParseValueLabelArray(vals);
    }

    private static List<FieldOptionDto>? ParseValueLabelArray(JsonElement arr)
    {
        if (arr.ValueKind != JsonValueKind.Array) return null;
        var result = new List<FieldOptionDto>();
        foreach (var v in arr.EnumerateArray())
        {
            var val = v.TryGetProperty("value", out var vp) ? vp.GetString() ?? "" : "";
            var lbl = v.TryGetProperty("label", out var lp) ? lp.GetString() ?? val : val;
            if (!string.IsNullOrEmpty(val))
                result.Add(new FieldOptionDto { Value = val, Label = lbl });
        }
        return result.Count > 0 ? result : null;
    }
}
