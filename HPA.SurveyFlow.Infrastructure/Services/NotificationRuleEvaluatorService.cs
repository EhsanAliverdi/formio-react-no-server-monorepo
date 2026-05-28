using System.Text.Json;
using HPA.SurveyFlow.Domain.Entities;
using Microsoft.Extensions.Logging;

namespace HPA.SurveyFlow.Infrastructure.Services;

/// <summary>
/// Evaluates which notification rules match a given submission and returns the matched rules.
/// Supports recursive AND/OR condition groups with nested sub-groups.
/// </summary>
public class NotificationRuleEvaluatorService(ILogger<NotificationRuleEvaluatorService> logger)
{
    public IReadOnlyList<FormNotificationRule> Evaluate(
        IEnumerable<FormNotificationRule> rules,
        JsonElement submissionData)
    {
        var matched = new List<FormNotificationRule>();

        foreach (var rule in rules.Where(r => r.Enabled))
        {
            try
            {
                var group = JsonSerializer.Deserialize<ConditionNode>(
                    rule.ConditionGroupJson,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (group != null && EvaluateNode(group, submissionData))
                    matched.Add(rule);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to evaluate notification rule {RuleId} ({RuleName})", rule.Id, rule.Name);
            }
        }

        return matched;
    }

    private static bool EvaluateNode(ConditionNode node, JsonElement data)
    {
        if (node.Children != null)
        {
            // Group node
            return (node.Operator?.ToUpperInvariant() ?? "AND") == "AND"
                ? node.Children.All(child => EvaluateNode(child, data))
                : node.Children.Any(child => EvaluateNode(child, data));
        }

        // Leaf condition node
        if (string.IsNullOrWhiteSpace(node.FieldKey) || string.IsNullOrWhiteSpace(node.ConditionOperator))
            return false;

        var fieldValue = default(JsonElement);
        var hasField = data.ValueKind == JsonValueKind.Object
            && data.TryGetProperty(node.FieldKey, out fieldValue);

        return node.ConditionOperator.ToLowerInvariant() switch
        {
            "is_empty"     => !hasField || IsEmpty(fieldValue),
            "is_not_empty" => hasField && !IsEmpty(fieldValue),
            "equals"       => hasField && ValueEquals(fieldValue, node.Value),
            "not_equals"   => !hasField || !ValueEquals(fieldValue, node.Value),
            "contains"     => hasField && ValueContains(fieldValue, node.Value),
            "greater_than" => hasField && CompareNumeric(fieldValue, node.Value) > 0,
            "less_than"    => hasField && CompareNumeric(fieldValue, node.Value) < 0,
            "greater_than_or_equal" => hasField && CompareNumeric(fieldValue, node.Value) >= 0,
            "less_than_or_equal"    => hasField && CompareNumeric(fieldValue, node.Value) <= 0,
            _ => false
        };
    }

    private static bool IsEmpty(JsonElement el) =>
        el.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined
        || (el.ValueKind == JsonValueKind.String && string.IsNullOrWhiteSpace(el.GetString()))
        || (el.ValueKind == JsonValueKind.Array && el.GetArrayLength() == 0);

    private static bool ValueEquals(JsonElement el, object? expected)
    {
        if (expected == null)
            return el.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined;

        var expectedStr = expected.ToString()!;

        return el.ValueKind switch
        {
            JsonValueKind.String  => string.Equals(el.GetString(), expectedStr, StringComparison.OrdinalIgnoreCase),
            JsonValueKind.Number  => el.TryGetDouble(out var d) && double.TryParse(expectedStr, out var e) && Math.Abs(d - e) < 1e-10,
            JsonValueKind.True    => expectedStr is "true" or "True" or "1",
            JsonValueKind.False   => expectedStr is "false" or "False" or "0",
            _                     => false
        };
    }

    private static bool ValueContains(JsonElement el, object? expected)
    {
        if (expected == null) return false;
        var expectedStr = expected.ToString()!;

        if (el.ValueKind == JsonValueKind.String)
            return (el.GetString() ?? string.Empty).Contains(expectedStr, StringComparison.OrdinalIgnoreCase);

        if (el.ValueKind == JsonValueKind.Array)
            return el.EnumerateArray().Any(item => ValueEquals(item, expected));

        return false;
    }

    private static double CompareNumeric(JsonElement el, object? expected)
    {
        if (!el.TryGetDouble(out var actual)) return double.NaN;
        if (expected == null || !double.TryParse(expected.ToString(), out var exp)) return double.NaN;
        return actual - exp;
    }

    // Internal deserialization model matching the JSON structure sent from the frontend
    private class ConditionNode
    {
        public string? Operator { get; set; }
        public List<ConditionNode>? Children { get; set; }
        public string? FieldKey { get; set; }
        public string? ConditionOperator { get; set; }
        public object? Value { get; set; }
    }
}
