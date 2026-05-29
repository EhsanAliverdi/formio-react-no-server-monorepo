using System.Text.Json;
using HPA.SurveyFlow.Domain.Entities;
using HPA.SurveyFlow.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace HPA.SurveyFlow.Infrastructure.Data.Seed;

/// <summary>
/// Seeds demo Datasets (reusable filtered views) and ScheduledReports (email delivery)
/// for the pre-start checklist forms.
/// </summary>
public static class DemoDatasetsAndSchedulesSeedData
{
    public static async Task SeedDatasetsAsync(AppDbContext db, bool overrideExisting = false)
    {
        var adminUser = await db.Users.FirstOrDefaultAsync(u => u.Role == "admin");
        if (adminUser == null) return;

        foreach (var definition in DemoEquipmentMexFlowSeedData.Definitions)
        {
            var form = await db.Forms.FirstOrDefaultAsync(f => f.Name == definition.ParentFormName);
            if (form == null) continue;

            await SeedDatasetAsync(db, adminUser.Id, form.Id, overrideExisting,
                name: $"{TitleCase(definition.EquipmentName)} — All Pre-Starts",
                description: $"All pre-start submissions for {definition.EquipmentName}. No filters applied — full history.",
                baseFilters: null);

            await SeedDatasetAsync(db, adminUser.Id, form.Id, overrideExisting,
                name: $"{TitleCase(definition.EquipmentName)} — Faults Found",
                description: $"Pre-starts for {definition.EquipmentName} where faults were reported. Used by safety reports and scheduled delivery.",
                baseFilters: FaultsFoundFilter());
        }

        await db.SaveChangesAsync();
    }

    public static async Task SeedSchedulesAsync(AppDbContext db, bool overrideExisting = false)
    {
        var adminUser = await db.Users.FirstOrDefaultAsync(u => u.Role == "admin");
        if (adminUser == null) return;

        foreach (var definition in DemoEquipmentMexFlowSeedData.Definitions)
        {
            var form = await db.Forms.FirstOrDefaultAsync(f => f.Name == definition.ParentFormName);
            if (form == null) continue;

            var safetyTemplate = await db.ReportTemplates
                .FirstOrDefaultAsync(t => t.FormId == form.Id && t.Name.Contains("Safety Issues"));
            if (safetyTemplate != null)
            {
                await SeedScheduledReportAsync(db, adminUser.Id, safetyTemplate.Id, overrideExisting,
                    name: $"{TitleCase(definition.EquipmentName)} Weekly Safety Summary",
                    cronExpression: "0 7 * * 1",
                    recipients: "admin@example.com",
                    subject: "{{ReportName}} — week ending {{RunDate}}",
                    isEnabled: false);
            }

            var summaryTemplate = await db.ReportTemplates
                .FirstOrDefaultAsync(t => t.FormId == form.Id && t.Name.Contains("Summary by Machine"));
            if (summaryTemplate != null)
            {
                await SeedScheduledReportAsync(db, adminUser.Id, summaryTemplate.Id, overrideExisting,
                    name: $"{TitleCase(definition.EquipmentName)} Daily Pre-Start Digest",
                    cronExpression: "0 6 * * *",
                    recipients: "admin@example.com",
                    subject: "{{ReportName}} — {{RunDate}}",
                    isEnabled: false);
            }
        }

        await db.SaveChangesAsync();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static async Task SeedDatasetAsync(
        AppDbContext db,
        int createdBy,
        int formId,
        bool overrideExisting,
        string name,
        string description,
        string? baseFilters)
    {
        var existing = await db.Datasets.FirstOrDefaultAsync(d => d.FormId == formId && d.Name == name);

        if (existing != null && !overrideExisting) return;

        if (existing != null)
        {
            existing.Description    = description;
            existing.BaseFiltersJson = baseFilters;
            existing.UpdatedAt      = DateTime.UtcNow;
            return;
        }

        db.Datasets.Add(new Dataset
        {
            FormId          = formId,
            Name            = name,
            Description     = description,
            BaseFiltersJson = baseFilters,
            IsActive        = true,
            CreatedBy       = createdBy,
            CreatedAt       = DateTime.UtcNow,
            UpdatedAt       = DateTime.UtcNow,
        });
    }

    private static async Task SeedScheduledReportAsync(
        AppDbContext db,
        int createdBy,
        int reportTemplateId,
        bool overrideExisting,
        string name,
        string cronExpression,
        string recipients,
        string subject,
        bool isEnabled)
    {
        var existing = await db.ScheduledReports
            .FirstOrDefaultAsync(s => s.ReportTemplateId == reportTemplateId && s.Name == name);

        if (existing != null && !overrideExisting) return;

        if (existing != null)
        {
            existing.CronExpression = cronExpression;
            existing.Recipients     = recipients;
            existing.Subject        = subject;
            existing.IsEnabled      = isEnabled;
            existing.UpdatedAt      = DateTime.UtcNow;
            existing.NextRunAt      = CronHelper.NextOccurrence(cronExpression);
            return;
        }

        db.ScheduledReports.Add(new ScheduledReport
        {
            ReportTemplateId = reportTemplateId,
            Name             = name,
            CronExpression   = cronExpression,
            Recipients       = recipients,
            Subject          = subject,
            IsEnabled        = isEnabled,
            CreatedBy        = createdBy,
            CreatedAt        = DateTime.UtcNow,
            UpdatedAt        = DateTime.UtcNow,
            NextRunAt        = CronHelper.NextOccurrence(cronExpression),
        });
    }

    private static string FaultsFoundFilter() => JsonSerializer.Serialize(new
    {
        @operator = "AND",
        children  = new[] { new { field_key = "faultsFound", condition_operator = "equals", value = "yes" } },
    });

    private static string TitleCase(string value) =>
        string.Join(" ", value.Split(' ', '/', StringSplitOptions.RemoveEmptyEntries)
            .Select(w => char.ToUpperInvariant(w[0]) + w[1..]));
}
