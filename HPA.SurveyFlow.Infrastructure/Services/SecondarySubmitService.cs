using System.Text;
using System.Text.Json;
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
    public void DispatchAsync(string integration, string action, string submissionDataJson, int submissionId, string outcome = "success")
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
                .FirstOrDefaultAsync(s => s.Id == submissionId);
            if (submission == null) return;
            submission.SecondarySubmitStatus = "pending";
            await db.SaveChangesAsync();

            var formJson = submission.Form.Json;

            // Execute the integration
            SecondarySubmitOutcome outcomeResult;
            try
            {
                outcomeResult = integration.ToLowerInvariant() switch
                {
                    "mex" => await ExecuteMexAsync(db, action, submissionDataJson, formJson, submissionId),
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

    private async Task<SecondarySubmitOutcome> ExecuteMexAsync(AppDbContext db, string action, string submissionDataJson, string formJson, int submissionId)
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
            "create_request" => await MexCreateRequestAsync(baseUrl, apiKey, submissionDataJson, formJson, submissionId),
            _ => new SecondarySubmitOutcome(false, ErrorJson($"Unknown MEX action: {action}"), null)
        };
    }

    private async Task<SecondarySubmitOutcome> MexCreateRequestAsync(
        string baseUrl, string apiKey, string submissionDataJson, string formJson, int submissionId)
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

        var payload = new
        {
            requestNumber,
            jobTypeName,
            estimatedCost = 0,
            requesterDetails = baseDescription,
            jobDescription,
            raisedDate = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss"),
        };

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

    private record SecondarySubmitOutcome(bool Success, string? ResponseJson, string? LegacyError);
}
