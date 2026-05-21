using System.Text.Json;

namespace HPA.SurveyFlow.Infrastructure.Services;

public static class AbnormalitiesService
{
    public record Abnormality(string Key, string? Type, string? Label, object? NormalValue, string Level = "error");

    public static List<Abnormality> Compute(string formJson, string submissionDataJson)
    {
        var result = new List<Abnormality>();
        try
        {
            var schema = JsonDocument.Parse(formJson).RootElement;
            var data = JsonDocument.Parse(submissionDataJson).RootElement;
            ScanComponents(schema, data, result);
        }
        catch { /* malformed JSON — return empty */ }
        return result;
    }

    private static void ScanComponents(JsonElement schema, JsonElement data, List<Abnormality> result)
    {
        if (!schema.TryGetProperty("components", out var components)) return;
        foreach (var comp in components.EnumerateArray())
        {
            ScanComponent(comp, data, result);
            // recurse into nested components
            ScanComponents(comp, data, result);
        }
    }

    private static void ScanComponent(JsonElement comp, JsonElement data, List<Abnormality> result)
    {
        if (!comp.TryGetProperty("properties", out var props)) return;
        if (!props.TryGetProperty("abnormal_enabled", out var enabled)) return;
        if (enabled.ValueKind != JsonValueKind.True && enabled.GetRawText() != "true") return;

        if (!comp.TryGetProperty("key", out var keyEl)) return;
        var key = keyEl.GetString() ?? "";

        var normalValues = ReadConfiguredValues(props, "abnormal_normal_values");
        props.TryGetProperty("abnormal_normal_value", out var normalValueEl);
        if (normalValues.Count == 0 && normalValueEl.ValueKind != JsonValueKind.Undefined)
            normalValues.Add(NormalizeValue(normalValueEl));

        var errorValues = ReadConfiguredValues(props, "abnormal_error_values");
        var warningValues = ReadConfiguredValues(props, "abnormal_warning_values");
        var normalValue = normalValues.Count > 0 ? normalValues : null;

        comp.TryGetProperty("type", out var typeEl);
        var type = typeEl.GetString();

        comp.TryGetProperty("label", out var labelEl);
        var label = labelEl.GetString();

        props.TryGetProperty("abnormal_level", out var levelEl);
        props.TryGetProperty("abnormal_default_level", out var defaultLevelEl);
        var legacyLevel = levelEl.ValueKind == JsonValueKind.Undefined ? "error" : (levelEl.GetString() ?? "error");
        var defaultLevel = defaultLevelEl.ValueKind == JsonValueKind.Undefined ? legacyLevel : (defaultLevelEl.GetString() ?? legacyLevel);

        if (!data.TryGetProperty(key, out var actual)) return;
        var actualValue = NormalizeValue(actual);

        if (errorValues.Contains(actualValue))
        {
            result.Add(new Abnormality(key, type, label, normalValue, "error"));
            return;
        }

        if (warningValues.Contains(actualValue))
        {
            result.Add(new Abnormality(key, type, label, normalValue, "warning"));
            return;
        }

        if (normalValues.Contains(actualValue)) return;

        if (normalValues.Count > 0 && defaultLevel != "none")
            result.Add(new Abnormality(key, type, label, normalValue, defaultLevel == "warning" ? "warning" : "error"));
    }

    private static List<string> ReadConfiguredValues(JsonElement props, string key)
    {
        if (!props.TryGetProperty(key, out var valuesEl) || valuesEl.ValueKind == JsonValueKind.Undefined)
            return [];

        if (valuesEl.ValueKind == JsonValueKind.Array)
        {
            return valuesEl.EnumerateArray()
                .SelectMany(ReadConfiguredValueItem)
                .Where(v => !string.IsNullOrWhiteSpace(v))
                .Distinct()
                .ToList();
        }

        var single = NormalizeValue(valuesEl);
        return string.IsNullOrWhiteSpace(single) ? [] : [single];
    }

    private static IEnumerable<string> ReadConfiguredValueItem(JsonElement item)
    {
        if (item.ValueKind == JsonValueKind.Object)
        {
            if (item.TryGetProperty("value", out var valueEl)) yield return NormalizeValue(valueEl);
            yield break;
        }

        yield return NormalizeValue(item);
    }

    private static string NormalizeValue(JsonElement value)
    {
        return value.ValueKind switch
        {
            JsonValueKind.String => value.GetString() ?? "",
            JsonValueKind.Number => value.GetRawText(),
            JsonValueKind.True => "true",
            JsonValueKind.False => "false",
            JsonValueKind.Null => "",
            _ => value.GetRawText()
        };
    }
}
