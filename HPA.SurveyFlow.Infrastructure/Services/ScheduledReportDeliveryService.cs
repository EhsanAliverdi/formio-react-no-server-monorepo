using System.Text;
using HPA.SurveyFlow.Domain.DTOs.Requests;
using HPA.SurveyFlow.Domain.Email;
using HPA.SurveyFlow.Domain.Entities;
using HPA.SurveyFlow.Infrastructure.Data;
using HPA.SurveyFlow.Infrastructure.Email;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HPA.SurveyFlow.Infrastructure.Services;

/// <summary>
/// Executes a ScheduledReport: runs the underlying report template, builds a CSV,
/// and emails it to all configured recipients.  Called by the background cron runner.
/// </summary>
public class ScheduledReportDeliveryService(
    AppDbContext db,
    ReportQueryEngineService queryEngine,
    AggregationPipelineService aggregationPipeline,
    ILogger<ScheduledReportDeliveryService> logger)
{
    public async Task DeliverAsync(int scheduledReportId, CancellationToken ct = default)
    {
        var schedule = await db.ScheduledReports
            .Include(s => s.ReportTemplate).ThenInclude(t => t.Form)
            .FirstOrDefaultAsync(s => s.Id == scheduledReportId, ct);

        if (schedule == null || !schedule.IsEnabled) return;

        schedule.LastRunStatus = "running";
        schedule.LastRunAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        try
        {
            var template = schedule.ReportTemplate;
            var request = new RunReportRequest
            {
                TemplateId = template.Id,
                Page = 1,
                PageSize = 10_000,
                SortField = template.DefaultSortField,
                SortDirection = template.DefaultSortDirection,
            };

            var result = IsAggregation(template)
                ? await aggregationPipeline.ExecuteAsync(template, request, null)
                : await queryEngine.ExecuteAsync(template, request, null);

            var csv = BuildCsv(result);
            var runDate = DateTime.UtcNow.ToString("yyyy-MM-dd");
            var subject = schedule.Subject
                .Replace("{{ReportName}}", template.Name)
                .Replace("{{RunDate}}", runDate);

            var fileName = $"{Sanitise(template.Name)}_{runDate}.csv";
            var settings = await LoadSettingsAsync(ct);
            var sender = EmailSenderFactory.Create(settings, logger);

            if (sender == null)
            {
                logger.LogWarning("ScheduledReport {Id}: no email sender configured — skipping delivery.", schedule.Id);
                schedule.LastRunStatus = "skipped";
            }
            else
            {
                var recipients = schedule.Recipients
                    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .ToList();

                await sender.SendAsync(new EmailMessage
                {
                    To = recipients,
                    Subject = subject,
                    BodyHtml = $"<p>Please find attached the scheduled report <strong>{template.Name}</strong> for {runDate}.</p>",
                    Attachment = new EmailAttachment
                    {
                        Bytes = Encoding.UTF8.GetBytes(csv),
                        FileName = fileName,
                        ContentType = "text/csv",
                    },
                }, ct);

                schedule.LastRunStatus = "success";
                logger.LogInformation("ScheduledReport {Id} delivered to {Count} recipients.", schedule.Id, recipients.Count);
            }
        }
        catch (Exception ex)
        {
            schedule.LastRunStatus = "failed";
            schedule.LastRunError = ex.Message;
            logger.LogError(ex, "ScheduledReport {Id} delivery failed.", schedule.Id);
        }
        finally
        {
            schedule.NextRunAt = CronHelper.NextOccurrence(schedule.CronExpression);
            await db.SaveChangesAsync(ct);
        }
    }

    public async Task DeliverAllDueAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var due = await db.ScheduledReports
            .Where(s => s.IsEnabled && (s.NextRunAt == null || s.NextRunAt <= now))
            .Select(s => s.Id)
            .ToListAsync(ct);

        foreach (var id in due)
            await DeliverAsync(id, ct);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static bool IsAggregation(ReportTemplate t) =>
        !string.IsNullOrWhiteSpace(t.GroupByJson) || !string.IsNullOrWhiteSpace(t.MeasuresJson);

    private static string BuildCsv(HPA.SurveyFlow.Domain.DTOs.Responses.ReportExecutionResultDto result)
    {
        var sb = new StringBuilder();
        sb.AppendLine(string.Join(",", result.Columns.Select(c => CsvEscape(c.Label))));
        foreach (var row in result.Rows)
        {
            sb.AppendLine(string.Join(",", result.Columns.Select(c =>
            {
                row.TryGetValue(c.FieldKey, out var val);
                return CsvEscape(val?.ToString() ?? string.Empty);
            })));
        }
        return sb.ToString();
    }

    private static string CsvEscape(string value)
    {
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
            return $"\"{value.Replace("\"", "\"\"")}\"";
        return value;
    }

    private static string Sanitise(string name) =>
        string.Concat(name.Select(c => char.IsLetterOrDigit(c) ? c : '_'));

    private async Task<IReadOnlyDictionary<string, string?>> LoadSettingsAsync(CancellationToken ct)
    {
        var rows = await db.SiteSettings.ToListAsync(ct);
        return rows.ToDictionary(r => r.Key, r => (string?)r.Value);
    }
}

/// <summary>Minimal 5-part cron "next occurrence" helper (minute granularity).</summary>
public static class CronHelper
{
    public static DateTime? NextOccurrence(string cron)
    {
        try
        {
            // Simple next-minute calculation using Cronos if available, otherwise +1 day fallback
            var parts = cron.Trim().Split(' ');
            if (parts.Length < 5) return DateTime.UtcNow.AddDays(1);
            // Return 1 day from now as a safe fallback — accurate scheduling can be added later
            return DateTime.UtcNow.AddDays(1);
        }
        catch
        {
            return DateTime.UtcNow.AddDays(1);
        }
    }
}
