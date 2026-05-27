using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using HPA.SurveyFlow.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace HPA.SurveyFlow.Infrastructure.Services;

public class SecondarySubmitService(IServiceScopeFactory scopeFactory, ILogger<SecondarySubmitService> logger)
{
    /// <summary>
    /// Marks the submission as "pending" immediately, then executes the integration call
    /// in a background Task. The caller does not await this — it returns right away.
    /// The submission row is updated with the result once the background task completes.
    /// </summary>
    public void DispatchAsync(string integration, string action, string submissionDataJson, int submissionId, string outcome = "success", string? submitConfigJson = null)
    {
        // Mark pending synchronously on the caller's scope before we fire off.
        // We deliberately do NOT await so the HTTP response is not delayed.
        _ = Task.Run(async () =>
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            // Mark as pending
            var submission = await db.FormSubmissions
                .Include(s => s.Form)
                .Include(s => s.User)
                .FirstOrDefaultAsync(s => s.Id == submissionId);
            if (submission == null) return;
            submission.SecondarySubmitStatus = "pending";
            await db.SaveChangesAsync();

            var formJson = submission.Form.Json;
            var formName = submission.Form.Name;
            var userEmail = submission.User?.Email ?? string.Empty;

            // Execute the integration
            SecondarySubmitOutcome outcomeResult;
            try
            {
                outcomeResult = integration.ToLowerInvariant() switch
                {
                    "mex" => await ExecuteMexAsync(db, action, submissionDataJson, formJson, formName, userEmail, submissionId, outcome, submitConfigJson),
                    _ => new SecondarySubmitOutcome(false, null, $"Unknown integration: {integration}")
                };
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Secondary submit failed for integration={Integration} action={Action} submissionId={Id}",
                    integration, action, submissionId);
                outcomeResult = new SecondarySubmitOutcome(false, null, ex.Message);
            }

            // Persist result
            submission = await db.FormSubmissions.FindAsync(submissionId);
            if (submission == null) return;
            submission.SecondarySubmitStatus = outcomeResult.Success ? "success" : "failed";
            submission.SecondarySubmitAt = DateTime.UtcNow;
            submission.SecondarySubmitResponse = BuildSubmitLogJson(
                outcome,
                integration,
                action,
                submission.SecondarySubmitStatus,
                outcomeResult.ResponseJson,
                outcomeResult.LegacyError,
                submission.SecondarySubmitAt.Value);
            await db.SaveChangesAsync();

            logger.LogInformation("Secondary submit completed: submissionId={Id} integration={Integration} status={Status}",
                submissionId, integration, submission.SecondarySubmitStatus);
        });
    }

    private async Task<SecondarySubmitOutcome> ExecuteMexAsync(AppDbContext db, string action, string submissionDataJson, string formJson, string formName, string userEmail, int submissionId, string outcome, string? submitConfigJson)
    {
        var settings = (await db.SiteSettings.ToListAsync()).ToDictionary(s => s.Key, s => s.Value);

        var baseUrl = settings.GetValueOrDefault("integration.mex.baseUrl");
        var apiKey = settings.GetValueOrDefault("integration.mex.apiKey");
        var enabled = settings.GetValueOrDefault("integration.mex.enabled");

        if (enabled != "true")
            return new SecondarySubmitOutcome(false, ErrorJson("MEX integration is not enabled."), null);
        if (string.IsNullOrWhiteSpace(baseUrl))
            return new SecondarySubmitOutcome(false, ErrorJson("MEX base URL is not configured."), null);
        if (string.IsNullOrWhiteSpace(apiKey))
            return new SecondarySubmitOutcome(false, ErrorJson("MEX API key is not configured."), null);

        return action.ToLowerInvariant() switch
        {
            "create_request" => await MexCreateRequestAsync(db, baseUrl, apiKey, submissionDataJson, formJson, formName, userEmail, submissionId, outcome, submitConfigJson),
            _ => new SecondarySubmitOutcome(false, ErrorJson($"Unknown MEX action: {action}"), null)
        };
    }

    private async Task<SecondarySubmitOutcome> MexCreateRequestAsync(
        AppDbContext db, string baseUrl, string apiKey, string submissionDataJson, string formJson, string formName, string userEmail, int submissionId, string outcome, string? submitConfigJson)
    {
        JsonElement data;
        try { data = JsonDocument.Parse(submissionDataJson).RootElement; }
        catch { return new SecondarySubmitOutcome(false, ErrorJson("Invalid submission data JSON."), null); }

        using var http = new System.Net.Http.HttpClient { Timeout = TimeSpan.FromSeconds(30) };
        http.DefaultRequestHeaders.Add("XApiKey", apiKey);
        var base_ = baseUrl.TrimEnd('/');

        // Resolve contactId
        int contactId = 1;
        try
        {
            if (data.TryGetProperty("contactUsername", out var uEl) && uEl.GetString() is { } username)
            {
                var r = await http.GetAsync(base_ + $"/Contact/GetByUsername/{Uri.EscapeDataString(username)}");
                if (r.IsSuccessStatusCode)
                {
                    var doc = JsonDocument.Parse(await r.Content.ReadAsStringAsync());
                    if (doc.RootElement.TryGetProperty("contactId", out var cid))
                        contactId = cid.GetInt32();
                }
            }
        }
        catch { }

        // requestNumber
        var requestNumber = data.TryGetProperty("requestNumber", out var rnEl) && rnEl.GetInt32() is var rn and > 0
            ? rn
            : int.Parse(DateTime.UtcNow.ToString("HHmmss"));

        // jobTypeName
        var jobTypeName = data.TryGetProperty("jobTypeName", out var jtEl) ? jtEl.GetString() : null;
        if (string.IsNullOrWhiteSpace(jobTypeName))
        {
            try
            {
                var jtResp = await http.GetAsync(base_ + "/JobType/GetAll");
                if (jtResp.IsSuccessStatusCode)
                {
                    var jtDoc = JsonDocument.Parse(await jtResp.Content.ReadAsStringAsync());
                    foreach (var jt in jtDoc.RootElement.EnumerateArray())
                    {
                        if (jt.TryGetProperty("active", out var active) && active.ValueKind == JsonValueKind.False) continue;
                        if (jt.TryGetProperty("isActive", out var isActive) && isActive.ValueKind == JsonValueKind.False) continue;
                        if (jt.TryGetProperty("jobTypeName", out var jtName)) { jobTypeName = jtName.GetString(); break; }
                    }
                }
            }
            catch { }
        }

        if (string.IsNullOrWhiteSpace(jobTypeName))
            return new SecondarySubmitOutcome(false, ErrorJson("Could not determine job type for MEX request."), null);

        var baseDescription = data.TryGetProperty("description", out var descEl) && !string.IsNullOrWhiteSpace(descEl.GetString())
            ? descEl.GetString()!
            : $"Submitted via SurveyFlow (submission #{submissionId})";

        // TODO: map form fields properly to MEX request fields in a future iteration
        // (e.g. map equipmentId → asset, location → site, reporterName → requester)
        // For now we embed all abnormal answers in the job description for traceability.
        var abnormalities = AbnormalitiesService.Compute(formJson, submissionDataJson);
        var jobDescription = abnormalities.Count > 0
            ? BuildJobDescriptionWithAbnormalities(baseDescription, abnormalities)
            : baseDescription;

        var payload = new Dictionary<string, object?>
        {
            ["requestNumber"] = requestNumber,
            ["jobTypeName"] = jobTypeName,
            ["estimatedCost"] = 0,
            ["requesterDetails"] = baseDescription,
            ["jobDescription"] = jobDescription,
            ["requestedDateTime"] = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss"),
        };

        ApplyPayloadMappings(payload, submitConfigJson, data, formJson, abnormalities, submissionId, outcome, formName, userEmail);
        await ResolveMexAssetReferenceAsync(db, payload);
        payload = NormalizeMexCreateRequestPayload(payload);

        var json = JsonSerializer.Serialize(payload);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // MEX endpoint is POST /Request/{contactId} — contactId goes in the URL
        var response = await http.PostAsync(base_ + $"/Request/{contactId}", content);
        var body = await response.Content.ReadAsStringAsync();

        // Store full response JSON for traceability
        var responseJson = JsonSerializer.Serialize(new
        {
            integration = "mex",
            action = "create_request",
            status_code = (int)response.StatusCode,
            success = response.IsSuccessStatusCode,
            body,
            sent_payload = payload,
        });

        return new SecondarySubmitOutcome(response.IsSuccessStatusCode, responseJson, null);
    }

    private static async Task ResolveMexAssetReferenceAsync(AppDbContext db, Dictionary<string, object?> payload)
    {
        if (!payload.TryGetValue("asset", out var assetValue))
            return;

        var submitted = Convert.ToString(assetValue, System.Globalization.CultureInfo.InvariantCulture)?.Trim();
        if (string.IsNullOrWhiteSpace(submitted))
            return;

        var submittedLocalId = int.TryParse(submitted, out var parsedId) ? parsedId : (int?)null;
        var assetQuery = db.ExternalAssets.Where(a => a.Source == "mex");
        var asset = submittedLocalId.HasValue
            ? await assetQuery
                .Where(a => a.Id == submittedLocalId.Value || a.ExternalId == submitted || a.DisplayName == submitted)
                .OrderByDescending(a => a.IsActive)
                .FirstOrDefaultAsync()
            : await assetQuery
                .Where(a => a.ExternalId == submitted || a.DisplayName == submitted)
                .OrderByDescending(a => a.IsActive)
                .FirstOrDefaultAsync();

        if (asset is null)
            return;

        var assetNumber = ReadRawString(asset.RawJson, "assetNumber", "AssetNumber");
        if (!string.IsNullOrWhiteSpace(assetNumber))
            payload["asset"] = assetNumber;

        var assetDescription = ReadRawString(asset.RawJson, "assetDescription", "AssetDescription") ?? asset.DisplayName;
        if (!payload.ContainsKey("assetDescription") && !string.IsNullOrWhiteSpace(assetDescription))
            payload["assetDescription"] = assetDescription;
    }

    private static Dictionary<string, object?> NormalizeMexCreateRequestPayload(Dictionary<string, object?> payload)
    {
        var normalized = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);

        foreach (var (field, spec) in MexRequestFieldSpecs)
        {
            payload.TryGetValue(field, out var rawValue);
            var value = CoerceMexRequestValue(rawValue, spec);

            if (value is null && spec.Required)
                value = spec.DefaultValue;

            if (value is null)
                continue;

            normalized[field] = value;
        }

        if (!normalized.TryGetValue("requestNumber", out var requestNumberValue)
            || requestNumberValue is not int requestNumber
            || requestNumber <= 0)
            normalized["requestNumber"] = int.Parse(DateTime.UtcNow.ToString("HHmmss"));
        if (!normalized.ContainsKey("estimatedCost"))
            normalized["estimatedCost"] = 0m;

        return normalized;
    }

    private static object? CoerceMexRequestValue(object? value, MexRequestFieldSpec spec)
    {
        if (value is null)
            return null;

        return spec.Type switch
        {
            MexRequestFieldType.String => CoerceString(value, spec.MaxLength),
            MexRequestFieldType.Integer => CoerceInteger(value),
            MexRequestFieldType.Decimal => CoerceDecimal(value),
            MexRequestFieldType.Boolean => CoerceBoolean(value),
            MexRequestFieldType.DateTime => CoerceDateTime(value),
            _ => value,
        };
    }

    private static string? CoerceString(object value, int? maxLength)
    {
        var text = value switch
        {
            JsonElement el => JsonElementToDisplayText(el),
            _ => Convert.ToString(value, System.Globalization.CultureInfo.InvariantCulture),
        };

        if (string.IsNullOrWhiteSpace(text))
            return null;

        text = text.Trim();
        return maxLength.HasValue && text.Length > maxLength.Value
            ? text[..maxLength.Value]
            : text;
    }

    private static int? CoerceInteger(object value)
    {
        return value switch
        {
            int i => i,
            long l when l is >= int.MinValue and <= int.MaxValue => (int)l,
            decimal d => (int)d,
            double d => (int)d,
            JsonElement el when el.ValueKind == JsonValueKind.Number && el.TryGetInt32(out var i) => i,
            JsonElement el when el.ValueKind == JsonValueKind.String && int.TryParse(el.GetString(), out var i) => i,
            string s when int.TryParse(s, out var i) => i,
            _ => null,
        };
    }

    private static decimal? CoerceDecimal(object value)
    {
        return value switch
        {
            decimal d => d,
            int i => i,
            long l => l,
            double d => (decimal)d,
            JsonElement el when el.ValueKind == JsonValueKind.Number && el.TryGetDecimal(out var d) => d,
            JsonElement el when el.ValueKind == JsonValueKind.String && decimal.TryParse(el.GetString(), out var d) => d,
            string s when decimal.TryParse(s, out var d) => d,
            _ => null,
        };
    }

    private static bool? CoerceBoolean(object value)
    {
        return value switch
        {
            bool b => b,
            JsonElement el when el.ValueKind == JsonValueKind.True => true,
            JsonElement el when el.ValueKind == JsonValueKind.False => false,
            JsonElement el when el.ValueKind == JsonValueKind.String && bool.TryParse(el.GetString(), out var b) => b,
            string s when bool.TryParse(s, out var b) => b,
            string s when s == "1" => true,
            string s when s == "0" => false,
            _ => null,
        };
    }

    private static string? CoerceDateTime(object value)
    {
        var text = value switch
        {
            DateTime dt => dt.ToString("yyyy-MM-ddTHH:mm:ss"),
            JsonElement el when el.ValueKind == JsonValueKind.String => el.GetString(),
            _ => Convert.ToString(value, System.Globalization.CultureInfo.InvariantCulture),
        };

        if (string.IsNullOrWhiteSpace(text))
            return null;

        return DateTime.TryParse(text, out var parsed)
            ? parsed.ToString("yyyy-MM-ddTHH:mm:ss")
            : text.Trim();
    }

    private static string BuildJobDescriptionWithAbnormalities(
        string baseDescription, List<AbnormalitiesService.Abnormality> abnormalities)
    {
        var sb = new System.Text.StringBuilder();
        sb.AppendLine(baseDescription);
        sb.AppendLine();
        sb.AppendLine("--- Abnormal Answers ---");
        foreach (var a in abnormalities)
        {
            var level = a.Level.ToUpperInvariant();
            var label = !string.IsNullOrWhiteSpace(a.Label) ? a.Label : a.Key;
            sb.AppendLine($"[{level}] {label}: expected {a.NormalValue}, submitted value differs");
        }
        return sb.ToString().TrimEnd();
    }

    private static void ApplyPayloadMappings(
        Dictionary<string, object?> payload,
        string? submitConfigJson,
        JsonElement submissionData,
        string formJson,
        IReadOnlyList<AbnormalitiesService.Abnormality> abnormalities,
        int submissionId,
        string outcome,
        string formName,
        string userEmail)
    {
        if (string.IsNullOrWhiteSpace(submitConfigJson)) return;

        using JsonDocument configDoc = JsonDocument.Parse(submitConfigJson);
        if (!configDoc.RootElement.TryGetProperty("fieldMappings", out var mappingsEl)
            || mappingsEl.ValueKind != JsonValueKind.Object)
            return;

        var labelMap = BuildFieldLabelMap(formJson);

        foreach (var mappingProperty in mappingsEl.EnumerateObject())
        {
            var targetField = mappingProperty.Name;
            var mapping = mappingProperty.Value;
            if (mapping.ValueKind != JsonValueKind.Object) continue;

            var source = mapping.TryGetProperty("source", out var sourceEl)
                ? sourceEl.GetString()
                : null;

            if (string.IsNullOrWhiteSpace(source) || source == "default")
                continue;

            object? value = source switch
            {
                "field" => ResolveFieldMapping(mapping, submissionData),
                "static" => ResolveStaticMapping(mapping),
                "template" => ResolveTemplateMapping(mapping, submissionData, labelMap, abnormalities, submissionId, outcome, formName, userEmail),
                "abnormal_answers" => ResolveAbnormalAnswersMapping(mapping, abnormalities, submissionData),
                _ => null
            };

            if (value is not null)
                payload[targetField] = value;
        }
    }

    private static object? ResolveFieldMapping(JsonElement mapping, JsonElement submissionData)
    {
        var fieldKey = mapping.TryGetProperty("fieldKey", out var keyEl) ? keyEl.GetString() : null;
        if (string.IsNullOrWhiteSpace(fieldKey)
            || submissionData.ValueKind != JsonValueKind.Object
            || !submissionData.TryGetProperty(fieldKey, out var valueEl))
            return null;

        return JsonElementToObject(valueEl);
    }

    private static object? ResolveStaticMapping(JsonElement mapping)
    {
        if (!mapping.TryGetProperty("value", out var valueEl))
            return null;

        return JsonElementToObject(valueEl);
    }

    private static string? ResolveTemplateMapping(
        JsonElement mapping,
        JsonElement submissionData,
        IReadOnlyDictionary<string, string> labelMap,
        IReadOnlyList<AbnormalitiesService.Abnormality> abnormalities,
        int submissionId,
        string outcome,
        string formName,
        string userEmail)
    {
        var template = mapping.TryGetProperty("template", out var templateEl) ? templateEl.GetString() : null;
        if (template is null) return null;

        var result = template
            .Replace("{{submission_id}}", submissionId.ToString(), StringComparison.OrdinalIgnoreCase)
            .Replace("{{outcome}}", outcome, StringComparison.OrdinalIgnoreCase)
            .Replace("{{form_name}}", formName, StringComparison.OrdinalIgnoreCase)
            .Replace("{{user_email}}", userEmail, StringComparison.OrdinalIgnoreCase)
            .Replace("{{warning_answers}}", BuildAbnormalAnswersText(abnormalities.Where(a => a.Level == "warning"), submissionData), StringComparison.OrdinalIgnoreCase)
            .Replace("{{error_answers}}", BuildAbnormalAnswersText(abnormalities.Where(a => a.Level == "error"), submissionData), StringComparison.OrdinalIgnoreCase)
            .Replace("{{abnormal_answers}}", BuildAbnormalAnswersText(abnormalities, submissionData), StringComparison.OrdinalIgnoreCase)
            .Replace("{{warning_questions}}", string.Join(", ", abnormalities.Where(a => a.Level == "warning").Select(a => a.Label ?? a.Key)), StringComparison.OrdinalIgnoreCase)
            .Replace("{{error_questions}}", string.Join(", ", abnormalities.Where(a => a.Level == "error").Select(a => a.Label ?? a.Key)), StringComparison.OrdinalIgnoreCase)
            .Replace("{{abnormal_questions}}", string.Join(", ", abnormalities.Select(a => a.Label ?? a.Key)), StringComparison.OrdinalIgnoreCase);

        result = Regex.Replace(result, @"\{\{field:([^}]+)\}\}", match =>
        {
            var key = match.Groups[1].Value.Trim();
            if (submissionData.ValueKind == JsonValueKind.Object && submissionData.TryGetProperty(key, out var valueEl))
                return JsonElementToDisplayText(valueEl);
            return string.Empty;
        }, RegexOptions.IgnoreCase);

        result = Regex.Replace(result, @"\{\{label:([^}]+)\}\}", match =>
        {
            var key = match.Groups[1].Value.Trim();
            return labelMap.GetValueOrDefault(key, key);
        }, RegexOptions.IgnoreCase);

        return result.Trim();
    }

    private static string ResolveAbnormalAnswersMapping(
        JsonElement mapping,
        IReadOnlyList<AbnormalitiesService.Abnormality> abnormalities,
        JsonElement submissionData)
    {
        var level = mapping.TryGetProperty("level", out var levelEl) ? levelEl.GetString() : "all";
        var selected = level switch
        {
            "warning" => abnormalities.Where(a => a.Level == "warning"),
            "error" => abnormalities.Where(a => a.Level == "error"),
            _ => abnormalities
        };

        return BuildAbnormalAnswersText(selected, submissionData);
    }

    private static string BuildAbnormalAnswersText(IEnumerable<AbnormalitiesService.Abnormality> abnormalities, JsonElement submissionData)
    {
        var lines = abnormalities.Select(a =>
        {
            var label = string.IsNullOrWhiteSpace(a.Label) ? a.Key : a.Label;
            var value = submissionData.ValueKind == JsonValueKind.Object && submissionData.TryGetProperty(a.Key, out var actual)
                ? JsonElementToDisplayText(actual)
                : string.Empty;
            var reason = ResolveAbnormalReason(a.Key, submissionData);
            var level = a.Level.ToUpperInvariant();
            var line = string.IsNullOrWhiteSpace(value)
                ? $"[{level}] {label}"
                : $"[{level}] {label}: {value}";
            return string.IsNullOrWhiteSpace(reason) ? line : $"{line} | Reason: {reason}";
        });

        return string.Join(Environment.NewLine, lines);
    }

    private static string ResolveAbnormalReason(string key, JsonElement submissionData)
    {
        if (submissionData.ValueKind != JsonValueKind.Object) return string.Empty;

        var reasonKeys = new[]
        {
            $"{key}_explain",
            $"{key}Explain",
            $"{key}Reason",
            "faultDetails",
            "unsafeReason",
        };

        foreach (var reasonKey in reasonKeys)
        {
            if (!submissionData.TryGetProperty(reasonKey, out var reasonEl)) continue;
            var reason = JsonElementToDisplayText(reasonEl);
            if (!string.IsNullOrWhiteSpace(reason))
                return reason;
        }

        return string.Empty;
    }

    private static Dictionary<string, string> BuildFieldLabelMap(string formJson)
    {
        var labels = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        try
        {
            using var doc = JsonDocument.Parse(formJson);
            WalkFieldLabels(doc.RootElement, labels);
        }
        catch { }

        return labels;
    }

    private static void WalkFieldLabels(JsonElement element, Dictionary<string, string> labels)
    {
        if (element.ValueKind != JsonValueKind.Object) return;

        if (element.TryGetProperty("key", out var keyEl)
            && element.TryGetProperty("label", out var labelEl)
            && keyEl.GetString() is { Length: > 0 } key
            && labelEl.GetString() is { Length: > 0 } label)
            labels[key] = label;

        if (element.TryGetProperty("components", out var componentsEl) && componentsEl.ValueKind == JsonValueKind.Array)
        {
            foreach (var child in componentsEl.EnumerateArray())
                WalkFieldLabels(child, labels);
        }

        if (element.TryGetProperty("columns", out var columnsEl) && columnsEl.ValueKind == JsonValueKind.Array)
        {
            foreach (var column in columnsEl.EnumerateArray())
                if (column.TryGetProperty("components", out var columnComponents) && columnComponents.ValueKind == JsonValueKind.Array)
                    foreach (var child in columnComponents.EnumerateArray())
                        WalkFieldLabels(child, labels);
        }
    }

    private static object? JsonElementToObject(JsonElement element) =>
        element.ValueKind switch
        {
            JsonValueKind.String => element.GetString(),
            JsonValueKind.Number when element.TryGetInt64(out var longValue) => longValue,
            JsonValueKind.Number when element.TryGetDecimal(out var decimalValue) => decimalValue,
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.Null => null,
            JsonValueKind.Array or JsonValueKind.Object => element.Clone(),
            _ => element.ToString(),
        };

    private static string JsonElementToDisplayText(JsonElement element) =>
        element.ValueKind switch
        {
            JsonValueKind.String => element.GetString() ?? string.Empty,
            JsonValueKind.Number => element.ToString(),
            JsonValueKind.True => "true",
            JsonValueKind.False => "false",
            JsonValueKind.Array => string.Join(", ", element.EnumerateArray().Select(JsonElementToDisplayText)),
            JsonValueKind.Object => element.GetRawText(),
            JsonValueKind.Null => string.Empty,
            _ => element.ToString(),
        };

    private static string? ReadRawString(string? rawJson, params string[] keys)
    {
        if (string.IsNullOrWhiteSpace(rawJson))
            return null;

        try
        {
            using var doc = JsonDocument.Parse(rawJson);
            if (doc.RootElement.ValueKind != JsonValueKind.Object)
                return null;

            foreach (var key in keys)
            {
                if (doc.RootElement.TryGetProperty(key, out var value))
                    return JsonElementToDisplayText(value);
            }
        }
        catch { }

        return null;
    }

    private static string ErrorJson(string message) =>
        JsonSerializer.Serialize(new { success = false, error = message });

    private static string BuildSubmitLogJson(
        string outcome,
        string integration,
        string action,
        string status,
        string? resultJson,
        string? error,
        DateTime completedAt)
    {
        object? result = null;
        if (!string.IsNullOrWhiteSpace(resultJson))
        {
            try { result = JsonDocument.Parse(resultJson).RootElement.Clone(); }
            catch { result = resultJson; }
        }

        return JsonSerializer.Serialize(new
        {
            outcome,
            integration,
            action,
            status,
            success = status == "success",
            completed_at = completedAt,
            error,
            result,
        });
    }

    private static readonly IReadOnlyDictionary<string, MexRequestFieldSpec> MexRequestFieldSpecs =
        new Dictionary<string, MexRequestFieldSpec>(StringComparer.OrdinalIgnoreCase)
        {
            ["requestId"] = new(MexRequestFieldType.Integer),
            ["requestNumber"] = new(MexRequestFieldType.Integer, Required: true, DefaultValue: 0),
            ["requestedDateTime"] = new(MexRequestFieldType.DateTime),
            ["respondedDateTime"] = new(MexRequestFieldType.DateTime),
            ["requestedBy"] = new(MexRequestFieldType.String),
            ["workPhoneNo"] = new(MexRequestFieldType.String),
            ["mobile"] = new(MexRequestFieldType.String),
            ["email"] = new(MexRequestFieldType.String),
            ["jobType"] = new(MexRequestFieldType.Integer),
            ["jobTypeName"] = new(MexRequestFieldType.String, MaxLength: 10),
            ["jobTypeDescription"] = new(MexRequestFieldType.String, MaxLength: 50),
            ["department"] = new(MexRequestFieldType.String),
            ["estimatedCost"] = new(MexRequestFieldType.Decimal, Required: true, DefaultValue: 0m),
            ["priority"] = new(MexRequestFieldType.Integer),
            ["priorityNumber"] = new(MexRequestFieldType.Integer),
            ["priorityDescription"] = new(MexRequestFieldType.String, MaxLength: 25),
            ["status"] = new(MexRequestFieldType.Integer),
            ["statusAsOf"] = new(MexRequestFieldType.DateTime),
            ["statusUpdatedBy"] = new(MexRequestFieldType.String),
            ["approvalPath"] = new(MexRequestFieldType.String),
            ["requesterDetails"] = new(MexRequestFieldType.String, MaxLength: 4000),
            ["jobDescription"] = new(MexRequestFieldType.String),
            ["response"] = new(MexRequestFieldType.String),
            ["reasonCancelled"] = new(MexRequestFieldType.String),
            ["asset"] = new(MexRequestFieldType.String),
            ["assetDescription"] = new(MexRequestFieldType.String),
            ["workOrderNumber"] = new(MexRequestFieldType.Integer),
            ["workOrderCreatedDate"] = new(MexRequestFieldType.DateTime),
            ["workOrderCreatedBy"] = new(MexRequestFieldType.String),
            ["workOrderFinishDate"] = new(MexRequestFieldType.DateTime),
            ["workOrderAccountCode"] = new(MexRequestFieldType.String),
            ["workOrderStatus"] = new(MexRequestFieldType.String),
            ["isCancelled"] = new(MexRequestFieldType.Boolean),
            ["cancelledOn"] = new(MexRequestFieldType.DateTime),
            ["cancelledBy"] = new(MexRequestFieldType.String),
            ["isCompleted"] = new(MexRequestFieldType.Boolean),
            ["completedOn"] = new(MexRequestFieldType.DateTime),
            ["completedBy"] = new(MexRequestFieldType.String),
            ["isAccepted"] = new(MexRequestFieldType.Boolean),
            ["acceptedOn"] = new(MexRequestFieldType.DateTime),
            ["acceptedBy"] = new(MexRequestFieldType.String),
            ["emailListToNotify"] = new(MexRequestFieldType.String),
        };

    private enum MexRequestFieldType
    {
        String,
        Integer,
        Decimal,
        Boolean,
        DateTime,
    }

    private record MexRequestFieldSpec(
        MexRequestFieldType Type,
        int? MaxLength = null,
        bool Required = false,
        object? DefaultValue = null);

    private record SecondarySubmitOutcome(bool Success, string? ResponseJson, string? LegacyError);
}
