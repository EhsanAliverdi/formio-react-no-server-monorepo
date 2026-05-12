using System.Text.Json;

namespace SurveyFlow.Infrastructure.Services;

public static class AbnormalitiesService
{
    public record Abnormality(string Key, string? Type, string? Label, object? NormalValue);

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

        props.TryGetProperty("abnormal_normal_value", out var normalValueEl);
        var normalValue = normalValueEl.ValueKind == JsonValueKind.Undefined ? null : (object?)normalValueEl.GetRawText();

        comp.TryGetProperty("type", out var typeEl);
        var type = typeEl.GetString();

        comp.TryGetProperty("label", out var labelEl);
        var label = labelEl.GetString();

        if (!data.TryGetProperty(key, out var actual)) return;
        var actualRaw = actual.GetRawText();

        if (actualRaw != normalValueEl.GetRawText())
            result.Add(new Abnormality(key, type, label, normalValue));
    }
}
