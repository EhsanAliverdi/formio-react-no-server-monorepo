using System.Text.Json;
using HPA.SurveyFlow.Domain.DTOs.Responses;

namespace HPA.SurveyFlow.Infrastructure.Services;

/// <summary>
/// Walks a Form.io JSON schema and produces a flat list of reportable field descriptors.
/// Handles all standard container types (panel, tabs, columns, fieldset, datagrid, editgrid, well, table).
/// </summary>
public class FormSchemaResolverService
{
    private static readonly HashSet<string> ContainerTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "panel", "tabs", "tabscomponent", "columns", "fieldset", "well",
        "datagrid", "editgrid", "form", "container",
    };

    private static readonly HashSet<string> IgnoredTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "button", "htmlelement", "content", "columns", "panel",
        "fieldset", "well", "tabs", "tabscomponent", "datagrid", "editgrid",
        "form", "container",
    };

    public IReadOnlyList<FieldDescriptorDto> ResolveFields(string formJson)
    {
        var result = new List<FieldDescriptorDto>();
        try
        {
            using var doc = JsonDocument.Parse(formJson);
            var root = doc.RootElement;
            if (root.TryGetProperty("components", out var components))
                WalkComponents(components, prefix: null, result);
        }
        catch
        {
            // Return empty list on malformed schema
        }
        return result;
    }

    private void WalkComponents(JsonElement components, string? prefix, List<FieldDescriptorDto> result)
    {
        if (components.ValueKind != JsonValueKind.Array) return;

        foreach (var component in components.EnumerateArray())
        {
            if (!component.TryGetProperty("type", out var typeProp)) continue;
            var type = typeProp.GetString() ?? string.Empty;

            var key = component.TryGetProperty("key", out var kp) ? kp.GetString() ?? string.Empty : string.Empty;
            var label = component.TryGetProperty("label", out var lp) ? lp.GetString() ?? key : key;

            var fullKey = prefix != null && !string.IsNullOrEmpty(key) ? $"{prefix}.{key}" : key;

            // Tabs: iterate tab array, each tab has 'components'
            if (type.Equals("tabs", StringComparison.OrdinalIgnoreCase))
            {
                if (component.TryGetProperty("components", out var tabPanels))
                {
                    foreach (var tab in tabPanels.EnumerateArray())
                    {
                        if (tab.TryGetProperty("components", out var tabChildren))
                            WalkComponents(tabChildren, prefix, result);
                    }
                }
                continue;
            }

            // Datagrid / editgrid: prefix child fields with the grid key
            if (type.Equals("datagrid", StringComparison.OrdinalIgnoreCase) ||
                type.Equals("editgrid", StringComparison.OrdinalIgnoreCase))
            {
                if (component.TryGetProperty("components", out var gridChildren))
                    WalkComponents(gridChildren, fullKey, result);
                continue;
            }

            // Columns: each column has a 'components' array
            if (type.Equals("columns", StringComparison.OrdinalIgnoreCase))
            {
                if (component.TryGetProperty("columns", out var cols))
                {
                    foreach (var col in cols.EnumerateArray())
                    {
                        if (col.TryGetProperty("components", out var colChildren))
                            WalkComponents(colChildren, prefix, result);
                    }
                }
                continue;
            }

            // Generic containers with a 'components' child
            if (ContainerTypes.Contains(type))
            {
                if (component.TryGetProperty("components", out var children))
                    WalkComponents(children, prefix, result);
                continue;
            }

            // Skip non-data components
            if (IgnoredTypes.Contains(type) || string.IsNullOrEmpty(key)) continue;

            result.Add(new FieldDescriptorDto
            {
                Key = fullKey,
                Label = string.IsNullOrWhiteSpace(label) ? fullKey : label,
                Type = MapFieldType(type, component),
                Options = ExtractOptions(component),
            });
        }
    }

    private static string MapFieldType(string componentType, JsonElement component)
    {
        return componentType.ToLowerInvariant() switch
        {
            "number" or "currency" => "number",
            "checkbox" => "boolean",
            "datetime" or "day" => "date",
            "select" or "radio" or "selectboxes" => "select",
            _ => "text",
        };
    }

    private static List<FieldOptionDto>? ExtractOptions(JsonElement component)
    {
        // Form.io stores select/radio options under data.values
        if (!component.TryGetProperty("data", out var data)) return null;
        if (!data.TryGetProperty("values", out var values)) return null;
        if (values.ValueKind != JsonValueKind.Array) return null;

        var opts = new List<FieldOptionDto>();
        foreach (var v in values.EnumerateArray())
        {
            var val = v.TryGetProperty("value", out var vp) ? vp.GetString() ?? string.Empty : string.Empty;
            var lbl = v.TryGetProperty("label", out var lp) ? lp.GetString() ?? val : val;
            if (!string.IsNullOrEmpty(val))
                opts.Add(new FieldOptionDto { Value = val, Label = lbl });
        }
        return opts.Count > 0 ? opts : null;
    }
}
