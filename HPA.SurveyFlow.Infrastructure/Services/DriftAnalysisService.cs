using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using HPA.SurveyFlow.Domain.DTOs.Responses;
using HPA.SurveyFlow.Domain.Entities;

namespace HPA.SurveyFlow.Infrastructure.Services;

/// <summary>
/// Computes field-level schema drift between a saved ReportTemplate and the current Form schema.
/// Phase 1: replaces the whole-schema SHA-256 approach with per-column drift detection.
/// </summary>
public class DriftAnalysisService(FormSchemaResolverService schemaResolver)
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    /// <summary>
    /// Returns the current field catalog for a form and the per-column drift analysis
    /// for an existing template. A template with zero drift entries has no schema issues.
    /// </summary>
    public DriftAnalysisResult Analyse(ReportTemplate template, string currentFormJson)
    {
        var currentFields = schemaResolver.ResolveFields(currentFormJson);
        var fieldIndex = currentFields.ToDictionary(f => f.Key, f => f, StringComparer.OrdinalIgnoreCase);

        var columns = DeserializeColumns(template.ColumnsJson);
        var driftEntries = new List<FieldDriftEntryDto>();

        foreach (var col in columns)
        {
            if (string.IsNullOrWhiteSpace(col.FieldKey)) continue;

            if (!fieldIndex.TryGetValue(col.FieldKey, out var currentField))
            {
                // Check if field exists via dot-notation (datagrid parent might have been removed)
                var parentKey = col.FieldKey.Contains('.') ? col.FieldKey.Split('.')[0] : null;
                var parentExists = parentKey != null && fieldIndex.Keys.Any(k =>
                    k.StartsWith(parentKey + ".", StringComparison.OrdinalIgnoreCase));

                driftEntries.Add(new FieldDriftEntryDto
                {
                    FieldKey = col.FieldKey,
                    Label = col.Label ?? col.FieldKey,
                    DriftType = parentExists ? "parent_changed" : "missing",
                    Message = parentExists
                        ? $"The parent grid '{parentKey}' changed structure. Field '{col.FieldKey}' may no longer exist."
                        : $"Field '{col.FieldKey}' no longer exists in the form schema.",
                });
            }
            else
            {
                // Field exists — check for type change
                var expectedType = MapColumnFormatToType(col.Format);
                if (expectedType != null && expectedType != currentField.Type)
                {
                    driftEntries.Add(new FieldDriftEntryDto
                    {
                        FieldKey = col.FieldKey,
                        Label = col.Label ?? col.FieldKey,
                        DriftType = "type_changed",
                        Message = $"Field type changed from '{expectedType}' to '{currentField.Type}'.",
                    });
                }
            }
        }

        // Compute a new schema fingerprint from the current field set for storage
        var newSchemaVersion = ComputeFieldsHash(currentFields);

        return new DriftAnalysisResult
        {
            HasDrift = driftEntries.Count > 0,
            DriftEntries = driftEntries,
            CurrentFields = currentFields.ToList(),
            NewSchemaVersion = newSchemaVersion,
        };
    }

    /// <summary>Computes the schema version hash from the resolved field list (not raw form JSON).</summary>
    public static string ComputeFieldsHash(IReadOnlyList<FieldDescriptorDto> fields)
    {
        // Hash the sorted field keys + types so label/option changes don't trigger drift
        var sb = new StringBuilder();
        foreach (var f in fields.OrderBy(f => f.Key, StringComparer.OrdinalIgnoreCase))
            sb.Append(f.Key).Append(':').Append(f.Type).Append(';');

        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(sb.ToString()));
        return Convert.ToHexString(bytes)[..16];
    }

    private static string? MapColumnFormatToType(string? format)
    {
        return format switch
        {
            "number" => "number",
            "date" or "datetime" => "date",
            "boolean" => "boolean",
            _ => null,
        };
    }

    private static List<ColumnRef> DeserializeColumns(string columnsJson)
    {
        try
        {
            using var doc = JsonDocument.Parse(columnsJson);
            var result = new List<ColumnRef>();
            foreach (var el in doc.RootElement.EnumerateArray())
            {
                var fieldKey = el.TryGetProperty("field_key", out var fk) ? fk.GetString()
                             : el.TryGetProperty("fieldKey", out var fk2) ? fk2.GetString()
                             : null;
                var label = el.TryGetProperty("label", out var lbl) ? lbl.GetString() : null;
                var format = el.TryGetProperty("format", out var fmt) ? fmt.GetString() : null;
                if (!string.IsNullOrWhiteSpace(fieldKey))
                    result.Add(new ColumnRef(fieldKey, label, format));
            }
            return result;
        }
        catch { return []; }
    }

    private sealed record ColumnRef(string FieldKey, string? Label, string? Format);
}

public class DriftAnalysisResult
{
    public bool HasDrift { get; init; }
    public List<FieldDriftEntryDto> DriftEntries { get; init; } = [];
    public List<FieldDescriptorDto> CurrentFields { get; init; } = [];
    public string NewSchemaVersion { get; init; } = string.Empty;
}
