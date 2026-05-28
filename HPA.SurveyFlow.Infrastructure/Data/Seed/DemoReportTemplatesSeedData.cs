using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using HPA.SurveyFlow.Domain.Entities;
using HPA.SurveyFlow.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HPA.SurveyFlow.Infrastructure.Data.Seed;

/// <summary>
/// Seeds demonstration report templates for the pre-start checklist forms.
/// Templates are grouped by machine (machineId as first column) so operators
/// and supervisors can quickly review pre-start outcomes per asset.
/// </summary>
public static class DemoReportTemplatesSeedData
{
    public static async Task SeedAsync(AppDbContext db, bool overrideExisting = false)
    {
        // Find the admin user to associate templates with
        var adminUser = await db.Users.FirstOrDefaultAsync(u => u.Role == "admin");
        if (adminUser == null) return;

        foreach (var definition in DemoEquipmentMexFlowSeedData.Definitions)
        {
            var form = await db.Forms.FirstOrDefaultAsync(f => f.Name == definition.ParentFormName);
            if (form == null) continue;

            var schemaVersion = ComputeSchemaVersion(form.Json);

            await SeedTemplateAsync(db, adminUser.Id, form, schemaVersion, overrideExisting,
                name: $"{TitleCase(definition.EquipmentName)} Pre-Start — Summary by Machine",
                description: $"Overview of all {definition.EquipmentName} pre-start submissions grouped by machine ID. Shows operator, safety outcomes, and fault details.",
                isPublic: true,
                defaultSortField: "machineId",
                defaultSortDirection: "asc",
                defaultPageSize: 25,
                columns: SummaryColumns(),
                filters: null);

            await SeedTemplateAsync(db, adminUser.Id, form, schemaVersion, overrideExisting,
                name: $"{TitleCase(definition.EquipmentName)} Pre-Start — Safety Issues",
                description: $"All {definition.EquipmentName} submissions where faults were found or equipment was declared unsafe. Use this to prioritise maintenance.",
                isPublic: true,
                defaultSortField: "machineId",
                defaultSortDirection: "asc",
                defaultPageSize: 25,
                columns: SafetyColumns(),
                filters: FaultsFoundFilter());

            await SeedTemplateAsync(db, adminUser.Id, form, schemaVersion, overrideExisting,
                name: $"{TitleCase(definition.EquipmentName)} Pre-Start — Operator Declarations",
                description: $"Full declaration log for {definition.EquipmentName} pre-starts including operator name, employee ID, and safe-to-operate status.",
                isPublic: false,
                defaultSortField: "machineId",
                defaultSortDirection: "asc",
                defaultPageSize: 50,
                columns: DeclarationColumns(),
                filters: null);
        }

        await db.SaveChangesAsync();
    }

    // ── Column sets ──────────────────────────────────────────────────────────

    private static List<ReportColumnDef> SummaryColumns() =>
    [
        new("machineId",          "Machine ID"),
        new("fullName",           "Operator Name"),
        new("employeeId",         "Employee / Contractor ID"),
        new("firstOperatorShift", "First Operator of Shift"),
        new("faultsFound",        "Faults Found"),
        new("urgencyLevel",       "Urgency Level"),
        new("safeToOperate",      "Safe to Operate"),
    ];

    private static List<ReportColumnDef> SafetyColumns() =>
    [
        new("machineId",               "Machine ID"),
        new("fullName",                "Operator Name"),
        new("beaconsWorking",          "Beacons / Warning Devices"),
        new("gaugesWorking",           "Gauges & Instruments"),
        new("seatAndBeltOk",           "Seat & Seatbelt"),
        new("hornAudible",             "Horn Audible"),
        new("safetyDevicesTampered",   "Safety Devices Tampered"),
        new("brakesOk",                "Brakes"),
        new("steeringControlsOk",      "Steering & Controls"),
        new("visibleDamage",           "Visible Damage"),
        new("tyresOrWheelsDamaged",    "Tyres / Wheels Damaged"),
        new("leaksVisible",            "Leaks Visible"),
        new("faultDetails",            "Fault Details"),
        new("urgencyLevel",            "Urgency Level"),
        new("safeToOperate",           "Safe to Operate"),
    ];

    private static List<ReportColumnDef> DeclarationColumns() =>
    [
        new("machineId",          "Machine ID"),
        new("fullName",           "Operator Name"),
        new("employeeId",         "Employee / Contractor ID"),
        new("firstOperatorShift", "First Operator of Shift"),
        new("operatorSignature",  "Operator Signature"),
        new("safeToOperate",      "Safe to Operate"),
        new("unsafeReason",       "Unsafe Reason"),
    ];

    // ── Filter: faultsFound = yes ────────────────────────────────────────────

    private static string FaultsFoundFilter() => JsonSerializer.Serialize(new
    {
        @operator = "AND",
        children = new[]
        {
            new
            {
                field_key = "faultsFound",
                condition_operator = "equals",
                value = "yes",
            },
        },
    });

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static async Task SeedTemplateAsync(
        AppDbContext db,
        int createdBy,
        Form form,
        string schemaVersion,
        bool overrideExisting,
        string name,
        string description,
        bool isPublic,
        string defaultSortField,
        string defaultSortDirection,
        int defaultPageSize,
        List<ReportColumnDef> columns,
        string? filters)
    {
        var existing = await db.ReportTemplates
            .FirstOrDefaultAsync(t => t.FormId == form.Id && t.Name == name);

        if (existing != null && !overrideExisting) return;

        var columnsJson = JsonSerializer.Serialize(
            columns.Select(c => new { field_key = c.FieldKey, label = c.Label }));

        if (existing != null)
        {
            existing.Description = description;
            existing.IsPublic = isPublic;
            existing.ColumnsJson = columnsJson;
            existing.FiltersJson = filters;
            existing.DefaultSortField = defaultSortField;
            existing.DefaultSortDirection = defaultSortDirection;
            existing.DefaultPageSize = defaultPageSize;
            existing.SchemaVersion = schemaVersion;
            existing.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            db.ReportTemplates.Add(new ReportTemplate
            {
                FormId = form.Id,
                Name = name,
                Description = description,
                IsPublic = isPublic,
                CreatedBy = createdBy,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                ColumnsJson = columnsJson,
                FiltersJson = filters,
                DefaultSortField = defaultSortField,
                DefaultSortDirection = defaultSortDirection,
                DefaultPageSize = defaultPageSize,
                DisplayMode = "table",
                SchemaVersion = schemaVersion,
            });
        }
    }

    private static string ComputeSchemaVersion(string formJson)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(formJson.Trim()));
        return Convert.ToHexString(bytes)[..16];
    }

    private static string TitleCase(string value) =>
        string.Join(" ", value.Split(' ', '/', StringSplitOptions.RemoveEmptyEntries)
            .Select(w => char.ToUpperInvariant(w[0]) + w[1..]));

    private sealed record ReportColumnDef(string FieldKey, string Label);
}
