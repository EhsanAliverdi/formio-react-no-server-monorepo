using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using HPA.SurveyFlow.Domain.Entities;
using HPA.SurveyFlow.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace HPA.SurveyFlow.Infrastructure.Services;

/// <summary>
/// Evaluates integration rules for a submission and fires matched ones in the background.
/// Existing appSettings.secondarySubmit logic is handled separately by SecondarySubmitService —
/// this service runs in addition and does not replace it.
/// </summary>
public class IntegrationRuleExecutorService(
    IServiceScopeFactory scopeFactory,
    ILogger<IntegrationRuleExecutorService> logger)
{
    public void DispatchAsync(
        int formId,
        int submissionId,
        string submissionDataJson,
        string formJson,
        string formName,
        string userEmail,
        string outcome,
        IReadOnlyList<AbnormalitiesService.Abnormality> abnormalities)
    {
        _ = Task.Run(async () =>
        {
            try
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var secondarySubmit = scope.ServiceProvider.GetRequiredService<SecondarySubmitService>();

                var rules = await db.FormIntegrationRules
                    .Include(r => r.MexConfig)
                    .Include(r => r.WebhookConfig)
                    .Where(r => r.FormId == formId && r.Enabled)
                    .OrderBy(r => r.SortOrder).ThenBy(r => r.Id)
                    .ToListAsync();

                if (rules.Count == 0) return;

                JsonElement submissionData;
                try { submissionData = JsonDocument.Parse(submissionDataJson).RootElement; }
                catch { return; }

                var matched = rules
                    .Where(r => EvaluateConditions(r.ConditionGroupJson, submissionData))
                    .ToList();

                if (matched.Count == 0) return;

                logger.LogInformation(
                    "Integration rules: {Matched}/{Total} rules matched for submission {SubmissionId} on form {FormId}",
                    matched.Count, rules.Count, submissionId, formId);

                var settings = (await db.SiteSettings.ToListAsync())
                    .ToDictionary(s => s.Key, s => s.Value);

                foreach (var rule in matched)
                {
                    try
                    {
                        await ExecuteRuleAsync(rule, secondarySubmit, settings, submissionId, submissionDataJson, formJson, formName, userEmail, outcome, abnormalities);
                    }
                    catch (Exception ex)
                    {
                        logger.LogError(ex, "Integration rule {RuleId} ({RuleName}) failed for submission {SubmissionId}",
                            rule.Id, rule.Name, submissionId);
                    }
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "IntegrationRuleExecutorService background task failed for submission {SubmissionId}", submissionId);
            }
        });
    }

    private async Task ExecuteRuleAsync(
        FormIntegrationRule rule,
        SecondarySubmitService secondarySubmit,
        Dictionary<string, string> settings,
        int submissionId,
        string submissionDataJson,
        string formJson,
        string formName,
        string userEmail,
        string outcome,
        IReadOnlyList<AbnormalitiesService.Abnormality> abnormalities)
    {
        switch (rule.Channel.ToLowerInvariant())
        {
            case "mex":
                await ExecuteMexRuleAsync(rule, secondarySubmit, settings, submissionId, submissionDataJson, formJson, formName, userEmail, outcome);
                break;

            case "webhook":
                await ExecuteWebhookRuleAsync(rule, settings, submissionId, submissionDataJson, formName, userEmail, outcome, abnormalities);
                break;

            default:
                logger.LogWarning("Integration rule {RuleId} has unknown channel '{Channel}'", rule.Id, rule.Channel);
                break;
        }
    }

    private async Task ExecuteMexRuleAsync(
        FormIntegrationRule rule,
        SecondarySubmitService secondarySubmit,
        Dictionary<string, string> settings,
        int submissionId,
        string submissionDataJson,
        string formJson,
        string formName,
        string userEmail,
        string outcome)
    {
        var mex = rule.MexConfig;
        if (mex == null)
        {
            logger.LogWarning("Integration rule {RuleId} is channel=mex but has no mex_config", rule.Id);
            return;
        }

        if (settings.GetValueOrDefault("integration.mex.enabled") != "true")
        {
            logger.LogDebug("MEX integration disabled — skipping rule {RuleId}", rule.Id);
            return;
        }

        // Inject the rule's field mappings into a submit config JSON that SecondarySubmitService already understands
        var submitConfig = JsonSerializer.Serialize(new
        {
            enabled = true,
            integration = "mex",
            action = mex.Action,
            fieldMappings = JsonDocument.Parse(mex.FieldMappingsJson).RootElement,
        });

        // SecondarySubmitService.DispatchAsync is fire-and-forget — we call it synchronously
        // to reuse all existing MEX plumbing (asset resolution, normalization, response tracking).
        secondarySubmit.DispatchAsync("mex", mex.Action, submissionDataJson, submissionId, outcome, submitConfig);

        logger.LogInformation("Integration rule {RuleId} ({RuleName}) dispatched MEX {Action} for submission {SubmissionId}",
            rule.Id, rule.Name, mex.Action, submissionId);

        await Task.CompletedTask;
    }

    private async Task ExecuteWebhookRuleAsync(
        FormIntegrationRule rule,
        Dictionary<string, string> settings,
        int submissionId,
        string submissionDataJson,
        string formName,
        string userEmail,
        string outcome,
        IReadOnlyList<AbnormalitiesService.Abnormality> abnormalities)
    {
        var wh = rule.WebhookConfig;
        if (wh == null)
        {
            logger.LogWarning("Integration rule {RuleId} is channel=webhook but has no webhook_config", rule.Id);
            return;
        }

        if (string.IsNullOrWhiteSpace(wh.Url))
        {
            logger.LogWarning("Integration rule {RuleId} webhook has no URL configured", rule.Id);
            return;
        }

        var placeholders = BuildPlaceholders(submissionId, submissionDataJson, formName, userEmail, outcome, abnormalities);
        var body = ReplacePlaceholders(wh.BodyTemplate, placeholders);

        using var http = new System.Net.Http.HttpClient { Timeout = TimeSpan.FromSeconds(30) };

        // Apply custom headers
        List<(string Name, string Value)> headers = [];
        try
        {
            var headersEl = JsonDocument.Parse(wh.HeadersJson).RootElement;
            if (headersEl.ValueKind == JsonValueKind.Array)
            {
                foreach (var h in headersEl.EnumerateArray())
                {
                    if (h.TryGetProperty("name", out var n) && h.TryGetProperty("value", out var v))
                        headers.Add((n.GetString() ?? "", ReplacePlaceholders(v.GetString() ?? "", placeholders)));
                }
            }
        }
        catch { }

        foreach (var (name, value) in headers)
        {
            if (!string.IsNullOrWhiteSpace(name))
                http.DefaultRequestHeaders.TryAddWithoutValidation(name, value);
        }

        var method = wh.Method.ToUpperInvariant() switch
        {
            "GET"   => System.Net.Http.HttpMethod.Get,
            "PUT"   => System.Net.Http.HttpMethod.Put,
            "PATCH" => System.Net.Http.HttpMethod.Patch,
            _       => System.Net.Http.HttpMethod.Post,
        };

        var request = new System.Net.Http.HttpRequestMessage(method, wh.Url);
        if (method != System.Net.Http.HttpMethod.Get && !string.IsNullOrWhiteSpace(body))
            request.Content = new StringContent(body, Encoding.UTF8, "application/json");

        var response = await http.SendAsync(request);

        logger.LogInformation(
            "Integration rule {RuleId} ({RuleName}) webhook {Method} {Url} → {StatusCode} for submission {SubmissionId}",
            rule.Id, rule.Name, wh.Method, wh.Url, (int)response.StatusCode, submissionId);

        if (!response.IsSuccessStatusCode)
        {
            var responseBody = await response.Content.ReadAsStringAsync();
            logger.LogWarning("Webhook rule {RuleId} got non-success status {StatusCode}: {Body}",
                rule.Id, (int)response.StatusCode, responseBody);
        }
    }

    private bool EvaluateConditions(string conditionGroupJson, JsonElement submissionData)
    {
        try
        {
            var node = JsonSerializer.Deserialize<ConditionNode>(
                conditionGroupJson,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            if (node == null) return true;
            if (node.Children == null || node.Children.Count == 0) return true;
            return EvaluateNode(node, submissionData);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to evaluate conditions for integration rule — defaulting to skip");
            return false;
        }
    }

    private static bool EvaluateNode(ConditionNode node, JsonElement data)
    {
        if (node.Children != null)
        {
            return (node.Operator?.ToUpperInvariant() ?? "AND") == "AND"
                ? node.Children.All(c => EvaluateNode(c, data))
                : node.Children.Any(c => EvaluateNode(c, data));
        }

        if (string.IsNullOrWhiteSpace(node.FieldKey) || string.IsNullOrWhiteSpace(node.ConditionOperator))
            return false;

        var fieldValue = default(JsonElement);
        var hasField = data.ValueKind == JsonValueKind.Object
            && data.TryGetProperty(node.FieldKey, out fieldValue);

        var strValue = node.Value?.ToString() ?? string.Empty;

        return node.ConditionOperator.ToLowerInvariant() switch
        {
            "is_empty"              => !hasField || IsEmpty(fieldValue),
            "is_not_empty"          => hasField && !IsEmpty(fieldValue),
            "equals"                => hasField && GetString(fieldValue).Equals(strValue, StringComparison.OrdinalIgnoreCase),
            "not_equals"            => !hasField || !GetString(fieldValue).Equals(strValue, StringComparison.OrdinalIgnoreCase),
            "contains"              => hasField && GetString(fieldValue).Contains(strValue, StringComparison.OrdinalIgnoreCase),
            "greater_than"          => hasField && TryCompareDecimal(fieldValue, strValue, out var gt) && gt > 0,
            "less_than"             => hasField && TryCompareDecimal(fieldValue, strValue, out var lt) && lt < 0,
            "greater_than_or_equal" => hasField && TryCompareDecimal(fieldValue, strValue, out var gte) && gte >= 0,
            "less_than_or_equal"    => hasField && TryCompareDecimal(fieldValue, strValue, out var lte) && lte <= 0,
            _                       => false,
        };
    }

    private static bool IsEmpty(JsonElement el) =>
        el.ValueKind == JsonValueKind.Null ||
        (el.ValueKind == JsonValueKind.String && string.IsNullOrWhiteSpace(el.GetString()));

    private static string GetString(JsonElement el) => el.ValueKind switch
    {
        JsonValueKind.String => el.GetString() ?? string.Empty,
        JsonValueKind.Number => el.GetRawText(),
        JsonValueKind.True   => "true",
        JsonValueKind.False  => "false",
        _                    => string.Empty,
    };

    private static bool TryCompareDecimal(JsonElement field, string compareTo, out int result)
    {
        result = 0;
        var fieldStr = GetString(field);
        if (!decimal.TryParse(fieldStr, out var fieldDec) || !decimal.TryParse(compareTo, out var compareDec))
            return false;
        result = fieldDec.CompareTo(compareDec);
        return true;
    }

    private static Dictionary<string, string> BuildPlaceholders(
        int submissionId,
        string submissionDataJson,
        string formName,
        string userEmail,
        string outcome,
        IReadOnlyList<AbnormalitiesService.Abnormality> abnormalities)
    {
        var dict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["submission_id"] = submissionId.ToString(),
            ["form_name"]     = formName,
            ["user_email"]    = userEmail,
            ["outcome"]       = outcome,
            ["submitted_at"]  = DateTime.UtcNow.ToString("f"),
            ["error_count"]   = abnormalities.Count(a => a.Level == "error").ToString(),
            ["warning_count"] = abnormalities.Count(a => a.Level == "warning").ToString(),
        };

        try
        {
            var data = JsonDocument.Parse(submissionDataJson).RootElement;
            if (data.ValueKind == JsonValueKind.Object)
            {
                foreach (var prop in data.EnumerateObject())
                    dict[$"field:{prop.Name}"] = JsonElementToText(prop.Value);
            }
        }
        catch { }

        return dict;
    }

    private static string ReplacePlaceholders(string template, IReadOnlyDictionary<string, string> placeholders)
    {
        var result = template ?? string.Empty;
        foreach (var (key, value) in placeholders)
            result = result.Replace($"{{{{{key}}}}}", value, StringComparison.OrdinalIgnoreCase);
        return result;
    }

    private static string JsonElementToText(JsonElement el) => el.ValueKind switch
    {
        JsonValueKind.String  => el.GetString() ?? string.Empty,
        JsonValueKind.Number  => el.GetRawText(),
        JsonValueKind.True    => "true",
        JsonValueKind.False   => "false",
        JsonValueKind.Null    => string.Empty,
        JsonValueKind.Array   => string.Join(", ", el.EnumerateArray().Select(JsonElementToText)),
        _                     => el.GetRawText(),
    };

    private sealed class ConditionNode
    {
        public string? Operator { get; set; }           // AND | OR (group)
        public List<ConditionNode>? Children { get; set; } // non-null = group
        public string? FieldKey { get; set; }            // leaf
        public string? ConditionOperator { get; set; }   // leaf
        public object? Value { get; set; }               // leaf
    }
}
