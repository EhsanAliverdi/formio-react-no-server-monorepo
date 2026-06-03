using System.Text.Json;
using HPA.SurveyFlow.Domain.Entities;
using HPA.SurveyFlow.Infrastructure.Data;
using HPA.SurveyFlow.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace HPA.SurveyFlow.Infrastructure.Data.Seed;

/// <summary>
/// Seeds demonstration report templates for the Forklift pre-start checklist form only.
/// Uses machineName (resolved display name) in all columns and includes chart-type reports
/// for the operations dashboard.
/// </summary>
public static class DemoReportTemplatesSeedData
{
    private static readonly JsonSerializerOptions J = new(JsonSerializerDefaults.Web);

    public static async Task SeedAsync(AppDbContext db, bool overrideExisting = false)
    {
        var schemaResolver = new FormSchemaResolverService();
        var adminUser = await db.Users.FirstOrDefaultAsync(u => u.Role == "admin");
        if (adminUser == null) return;

        // Reports are seeded for Forklift only
        var forkliftDef = DemoEquipmentMexFlowSeedData.Definitions[0]; // Forklift is index 0
        var form = await db.Forms.FirstOrDefaultAsync(f => f.Name == forkliftDef.ParentFormName);
        if (form == null) return;

        var fields = schemaResolver.ResolveFields(form.Json);
        var schemaVersion = DriftAnalysisService.ComputeFieldsHash(fields);

        // 1. Summary by Machine — table
        await Seed(db, adminUser.Id, form, schemaVersion, overrideExisting,
            name: "Forklift Pre-Start — Summary by Machine",
            description: "Overview of all forklift pre-start submissions. One row per submission showing machine name, operator, shift, faults, urgency, and safe-to-operate outcome.",
            isPublic: true,
            defaultSortField: "machineId",
            defaultPageSize: 25,
            columns:
            [
                Col("machineId",          "Machine Name"),
                Col("fullName",           "Operator Name"),
                Col("employeeId",         "Employee / Contractor ID"),
                Col("firstOperatorShift", "First Operator of Shift"),
                Col("faultsFound",        "Faults Found"),
                Col("urgencyLevel",       "Urgency Level"),
                Col("safeToOperate",      "Safe to Operate"),
            ],
            filters: null,
            category: "Operations",
            tags: "prestart,summary,machine",
            roles: AllRoles());

        // 2. Safety Issues — table filtered to fault submissions
        await Seed(db, adminUser.Id, form, schemaVersion, overrideExisting,
            name: "Forklift Pre-Start — Safety Issues",
            description: "All forklift submissions where faults were found or equipment was declared unsafe. Use this to prioritise maintenance and follow-up.",
            isPublic: true,
            defaultSortField: "machineId",
            defaultPageSize: 25,
            columns:
            [
                Col("machineId",               "Machine Name"),
                Col("fullName",                "Operator Name"),
                Col("beaconsWorking",          "Beacons / Warning Devices"),
                Col("gaugesWorking",           "Gauges & Instruments"),
                Col("seatAndBeltOk",           "Seat & Seatbelt"),
                Col("hornAudible",             "Horn Audible"),
                Col("safetyDevicesTampered",   "Safety Devices Tampered"),
                Col("brakesOk",                "Brakes"),
                Col("steeringControlsOk",      "Steering & Controls"),
                Col("visibleDamage",           "Visible Damage"),
                Col("tyresOrWheelsDamaged",    "Tyres / Wheels Damaged"),
                Col("leaksVisible",            "Leaks Visible"),
                Col("faultDetails",            "Fault Details"),
                Col("urgencyLevel",            "Urgency Level"),
                Col("safeToOperate",           "Safe to Operate"),
            ],
            filters: FilterGroup("AND",
                Leaf("faultsFound", "equals", "yes")),
            category: "Safety",
            tags: "prestart,safety,faults",
            roles: ["admin", "editor", "supervisor"]);

        // 3. Operator Declarations — compliance table
        await Seed(db, adminUser.Id, form, schemaVersion, overrideExisting,
            name: "Forklift Pre-Start — Operator Declarations",
            description: "Compliance log showing every operator declaration — machine name, operator identity, shift, safe-to-operate status, and digital signature.",
            isPublic: false,
            defaultSortField: "machineId",
            defaultPageSize: 50,
            columns:
            [
                Col("machineId",          "Machine Name"),
                Col("fullName",           "Operator Name"),
                Col("employeeId",         "Employee / Contractor ID"),
                Col("firstOperatorShift", "First Operator of Shift"),
                Col("operatorSignature",  "Operator Signature"),
                Col("safeToOperate",      "Safe to Operate"),
                Col("unsafeReason",       "Unsafe Reason"),
            ],
            filters: null,
            category: "Compliance",
            tags: "prestart,declaration,operator",
            roles: ["admin", "supervisor"]);

        // 4. Faults by Machine — bar chart (group by machineName, count submissions)
        await Seed(db, adminUser.Id, form, schemaVersion, overrideExisting,
            name: "Forklift Pre-Start — Faults by Machine",
            description: "Bar chart — total pre-start submissions and fault count per forklift. Quickly identify which machines have the most reported faults.",
            isPublic: true,
            defaultSortField: "machineId",
            defaultPageSize: 100,
            columns:
            [
                Col("machineId", "Machine Name"),
                Col("faultsFound", "Faults Found"),
            ],
            filters: null,
            category: "Operations",
            tags: "prestart,chart,faults,bar",
            roles: AllRoles(),
            groupByJson: Serialize(new[]
            {
                new { field_key = "machineId", label = "Machine Name", alias = "machineId", date_trunc = (string?)null },
            }),
            measuresJson: Serialize(new[]
            {
                new { field_key = (string?)null,           label = "Total Submissions", aggregation = "count",                alias = "total_count" },
                new { field_key = (string?)"faultsFound", label = "Faults Found",      aggregation = "count_where_eq:yes",   alias = "fault_count" },
            }),
            chartType: "bar",
            chartConfigJson: Serialize(new { x_axis = "machineId", y_axes = new[] { "total_count", "fault_count" } }));

        // 5. Leaks Reported — Last 24 Hours — number card
        await Seed(db, adminUser.Id, form, schemaVersion, overrideExisting,
            name: "Forklift Pre-Start — Leaks Reported (Last 24 Hours)",
            description: "Number card showing how many forklift pre-starts reported a visible leak in the last 24 hours. Use on the operations dashboard for at-a-glance awareness.",
            isPublic: true,
            defaultSortField: "machineId",
            defaultPageSize: 100,
            columns:
            [
                Col("machineId", "Machine Name"),
                Col("leaksVisible", "Leaks Visible"),
            ],
            filters: FilterGroup("AND",
                Leaf("leaksVisible", "equals", "yes")),
            category: "Operations",
            tags: "prestart,leak,kpi,number_card",
            roles: AllRoles(),
            groupByJson: null,
            measuresJson: Serialize(new[]
            {
                new { field_key = (string?)null, label = "Leak Reports", aggregation = "count", alias = "leak_count" },
            }),
            chartType: "number_card",
            chartConfigJson: Serialize(new { value_field = "leak_count", label = "Leak Reports (24 h)" }));

        // 6. Unsafe-to-Operate — pie chart (safeToOperate yes vs no)
        await Seed(db, adminUser.Id, form, schemaVersion, overrideExisting,
            name: "Forklift Pre-Start — Safe vs Unsafe to Operate",
            description: "Pie chart showing the split between forklifts declared safe and unsafe to operate across all pre-start submissions.",
            isPublic: true,
            defaultSortField: "safeToOperate",
            defaultPageSize: 100,
            columns:
            [
                Col("safeToOperate", "Safe to Operate"),
            ],
            filters: null,
            category: "Safety",
            tags: "prestart,safe,unsafe,pie",
            roles: AllRoles(),
            groupByJson: Serialize(new[]
            {
                new { field_key = "safeToOperate", label = "Safe to Operate", alias = "safeToOperate", date_trunc = (string?)null },
            }),
            measuresJson: Serialize(new[]
            {
                new { field_key = (string?)null, label = "Count", aggregation = "count", alias = "count" },
            }),
            chartType: "pie",
            chartConfigJson: Serialize(new { label_field = "safeToOperate", value_field = "count" }));

        // 7. Urgency Breakdown — doughnut chart (minor / major / critical)
        await Seed(db, adminUser.Id, form, schemaVersion, overrideExisting,
            name: "Forklift Pre-Start — Urgency Level Breakdown",
            description: "Doughnut chart showing the proportion of fault urgency levels (minor, major, critical) across all forklift pre-starts where faults were found.",
            isPublic: true,
            defaultSortField: "urgencyLevel",
            defaultPageSize: 100,
            columns:
            [
                Col("urgencyLevel", "Urgency Level"),
            ],
            filters: FilterGroup("AND",
                Leaf("faultsFound", "equals", "yes")),
            category: "Safety",
            tags: "prestart,urgency,doughnut,chart",
            roles: AllRoles(),
            groupByJson: Serialize(new[]
            {
                new { field_key = "urgencyLevel", label = "Urgency Level", alias = "urgencyLevel", date_trunc = (string?)null },
            }),
            measuresJson: Serialize(new[]
            {
                new { field_key = (string?)null, label = "Count", aggregation = "count", alias = "count" },
            }),
            chartType: "doughnut",
            chartConfigJson: Serialize(new { label_field = "urgencyLevel", value_field = "count" }));

        await db.SaveChangesAsync();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static string[] AllRoles() => ["admin", "editor", "viewer", "supervisor", "operator"];

    private static ReportColumnDef Col(string key, string label) => new(key, label);

    private static string Serialize<T>(T obj) => JsonSerializer.Serialize(obj, J);

    private static string FilterGroup(string op, params object[] children) =>
        Serialize(new { @operator = op, children });

    private static object Leaf(string fieldKey, string conditionOperator, string value) =>
        new { field_key = fieldKey, condition_operator = conditionOperator, value };

    private static async Task Seed(
        AppDbContext db,
        int createdBy,
        Form form,
        string schemaVersion,
        bool overrideExisting,
        string name,
        string description,
        bool isPublic,
        string defaultSortField,
        int defaultPageSize,
        ReportColumnDef[] columns,
        string? filters,
        string? category = null,
        string? tags = null,
        string[]? roles = null,
        string? groupByJson = null,
        string? measuresJson = null,
        string chartType = "table",
        string? chartConfigJson = null)
    {
        var existing = await db.ReportTemplates
            .FirstOrDefaultAsync(t => t.FormId == form.Id && t.Name == name);

        if (existing != null && !overrideExisting) return;

        var columnsJson = Serialize(columns.Select(c => new { field_key = c.FieldKey, label = c.Label }));
        var rolesJson = roles is { Length: > 0 } ? Serialize(roles) : null;

        if (existing != null)
        {
            existing.Description          = description;
            existing.IsPublic             = isPublic;
            existing.ColumnsJson          = columnsJson;
            existing.FiltersJson          = filters;
            existing.DefaultSortField     = defaultSortField;
            existing.DefaultSortDirection = "asc";
            existing.DefaultPageSize      = defaultPageSize;
            existing.SchemaVersion        = schemaVersion;
            existing.UpdatedAt            = DateTime.UtcNow;
            existing.Category             = category;
            existing.Tags                 = tags;
            existing.SharedWithRolesJson  = rolesJson;
            existing.GroupByJson          = groupByJson;
            existing.MeasuresJson         = measuresJson;
            existing.ChartType            = chartType;
            existing.ChartConfigJson      = chartConfigJson;
        }
        else
        {
            db.ReportTemplates.Add(new ReportTemplate
            {
                FormId                = form.Id,
                Name                  = name,
                Description           = description,
                IsPublic              = isPublic,
                CreatedBy             = createdBy,
                CreatedAt             = DateTime.UtcNow,
                UpdatedAt             = DateTime.UtcNow,
                ColumnsJson           = columnsJson,
                FiltersJson           = filters,
                DefaultSortField      = defaultSortField,
                DefaultSortDirection  = "asc",
                DefaultPageSize       = defaultPageSize,
                DisplayMode           = "table",
                SchemaVersion         = schemaVersion,
                Category              = category,
                Tags                  = tags,
                SharedWithRolesJson   = rolesJson,
                GroupByJson           = groupByJson,
                MeasuresJson          = measuresJson,
                ChartType             = chartType,
                ChartConfigJson       = chartConfigJson,
            });
        }
    }

    private sealed record ReportColumnDef(string FieldKey, string Label);
}
