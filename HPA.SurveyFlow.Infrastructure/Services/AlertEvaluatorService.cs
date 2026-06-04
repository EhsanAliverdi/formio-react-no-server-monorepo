using System.Text;
using System.Text.Json;
using HPA.SurveyFlow.Domain.DTOs.Requests;
using HPA.SurveyFlow.Domain.Entities;
using HPA.SurveyFlow.Domain.Email;
using HPA.SurveyFlow.Infrastructure.Data;
using HPA.SurveyFlow.Infrastructure.Email;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HPA.SurveyFlow.Infrastructure.Services;

/// <summary>
/// Evaluates a ReportAlert by running its linked report template, extracting the
/// metric value for <see cref="ReportAlert.ConditionField"/>, comparing against
/// <see cref="ReportAlert.Threshold"/>, and sending notifications if triggered.
/// </summary>
public class AlertEvaluatorService(
    AppDbContext db,
    ReportQueryEngineService queryEngine,
    AggregationPipelineService aggregationPipeline,
    IntegrationActivityReportService integrationActivity,
    ILogger<AlertEvaluatorService> logger)
{
    public async Task EvaluateAsync(int alertId, CancellationToken ct = default)
    {
        var alert = await db.ReportAlerts
            .Include(a => a.ReportTemplate)
            .FirstOrDefaultAsync(a => a.Id == alertId, ct);

        if (alert == null || !alert.IsEnabled) return;

        alert.LastEvaluatedAt = DateTime.UtcNow;

        try
        {
            var template = alert.ReportTemplate;
            var request  = new RunReportRequest
            {
                TemplateId    = template.Id,
                Page          = 1,
                PageSize      = 10_000,
                SortField     = template.DefaultSortField,
                SortDirection = template.DefaultSortDirection,
            };

            var result = IsIntegrationActivity(template)
                ? await integrationActivity.ExecuteAsync(template, request)
                : IsAggregation(template)
                ? await aggregationPipeline.ExecuteAsync(template, request, null)
                : await queryEngine.ExecuteAsync(template, request, null);

            // Extract the metric value — sum all rows for the target field
            decimal metricValue = 0;
            foreach (var row in result.Rows)
            {
                if (row.TryGetValue(alert.ConditionField, out var raw) && raw != null)
                {
                    if (decimal.TryParse(raw.ToString(), out var v))
                        metricValue += v;
                }
            }

            alert.LastValue = metricValue;
            bool triggered  = Evaluate(metricValue, alert.ConditionOperator, alert.Threshold);

            if (triggered)
            {
                alert.LastTriggeredAt = DateTime.UtcNow;
                alert.LastStatus      = "triggered";
                await NotifyAsync(alert, metricValue, ct);
                logger.LogInformation("Alert {Id} '{Name}' triggered: {Field} = {Value} {Op} {Threshold}",
                    alert.Id, alert.Name, alert.ConditionField, metricValue, alert.ConditionOperator, alert.Threshold);
            }
            else
            {
                alert.LastStatus = "ok";
            }
        }
        catch (Exception ex)
        {
            alert.LastStatus = "error";
            alert.LastError  = ex.Message;
            logger.LogError(ex, "Alert {Id} evaluation failed.", alert.Id);
        }
        finally
        {
            await db.SaveChangesAsync(ct);
        }
    }

    public async Task EvaluateAllDueAsync(CancellationToken ct = default)
    {
        var ids = await db.ReportAlerts
            .Where(a => a.IsEnabled)
            .Select(a => a.Id)
            .ToListAsync(ct);

        foreach (var id in ids)
            await EvaluateAsync(id, ct);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static bool IsAggregation(ReportTemplate t) =>
        !string.IsNullOrWhiteSpace(t.GroupByJson) || !string.IsNullOrWhiteSpace(t.MeasuresJson);

    private static bool IsIntegrationActivity(ReportTemplate t) =>
        string.Equals(t.SourceType, "integration_activity", StringComparison.OrdinalIgnoreCase);

    private static bool Evaluate(decimal value, string op, decimal threshold) => op switch
    {
        "gt"  => value > threshold,
        "gte" => value >= threshold,
        "lt"  => value < threshold,
        "lte" => value <= threshold,
        "eq"  => value == threshold,
        "neq" => value != threshold,
        _     => false,
    };

    private async Task NotifyAsync(ReportAlert alert, decimal value, CancellationToken ct)
    {
        var runDate = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm") + " UTC";
        var subject = $"[Alert] {alert.Name} — {alert.ConditionField} {alert.ConditionOperator} {alert.Threshold} (current: {value})";
        var body    = $"<p>Alert <strong>{alert.Name}</strong> was triggered at {runDate}.</p>" +
                      $"<p>Metric <code>{alert.ConditionField}</code> = <strong>{value}</strong> " +
                      $"({alert.ConditionOperator} {alert.Threshold}).</p>";

        // Email
        if (!string.IsNullOrWhiteSpace(alert.Recipients))
        {
            var settings = await LoadSettingsAsync(ct);
            var sender   = EmailSenderFactory.Create(settings, logger);
            if (sender != null)
            {
                var recipients = alert.Recipients
                    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .ToList();

                await sender.SendAsync(new EmailMessage
                {
                    To       = recipients,
                    Subject  = subject,
                    BodyHtml = body,
                }, ct);
            }
        }

        // Webhook
        if (!string.IsNullOrWhiteSpace(alert.WebhookUrl))
        {
            try
            {
                using var http    = new System.Net.Http.HttpClient();
                var payload       = JsonSerializer.Serialize(new
                {
                    alert_id      = alert.Id,
                    alert_name    = alert.Name,
                    condition_field = alert.ConditionField,
                    condition_operator = alert.ConditionOperator,
                    threshold     = alert.Threshold,
                    current_value = value,
                    triggered_at  = DateTime.UtcNow,
                });
                await http.PostAsync(alert.WebhookUrl,
                    new System.Net.Http.StringContent(payload, Encoding.UTF8, "application/json"), ct);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Alert {Id} webhook delivery failed.", alert.Id);
            }
        }
    }

    private async Task<IReadOnlyDictionary<string, string?>> LoadSettingsAsync(CancellationToken ct)
    {
        var rows = await db.SiteSettings.ToListAsync(ct);
        return rows.ToDictionary(r => r.Key, r => (string?)r.Value);
    }
}
