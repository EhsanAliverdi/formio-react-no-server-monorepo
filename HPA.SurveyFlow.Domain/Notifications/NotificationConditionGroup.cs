namespace HPA.SurveyFlow.Domain.Notifications;

/// <summary>
/// Recursive AND/OR condition tree stored as JSON in FormNotificationRule.ConditionGroupJson.
/// Each node is either a group (with children) or a leaf condition (with fieldKey/operator/value).
/// </summary>
public class NotificationConditionNode
{
    // Group fields (set when this node is a group)
    public string? Operator { get; set; }           // "AND" | "OR"
    public List<NotificationConditionNode>? Children { get; set; }

    // Leaf fields (set when this node is a condition)
    public string? FieldKey { get; set; }
    public string? ConditionOperator { get; set; }  // "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "is_empty" | "is_not_empty"
    public object? Value { get; set; }

    public bool IsGroup => Children != null;
}
