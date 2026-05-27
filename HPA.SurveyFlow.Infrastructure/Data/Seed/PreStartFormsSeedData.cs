using System.Text.Json;

namespace HPA.SurveyFlow.Infrastructure.Data.Seed;

internal sealed record SeedForm(string Name, JsonElement Schema);

internal static class PreStartFormsSeedData
{
    public static IReadOnlyList<SeedForm> Forms { get; } =
        DemoEquipmentMexFlowSeedData.CreateInitialForms();

    public static IReadOnlySet<string> ActiveSeedFormNames { get; } =
        Forms.Select(f => f.Name).ToHashSet(StringComparer.OrdinalIgnoreCase);

    public static IReadOnlySet<string> RetiredSeedFormNames { get; } =
        new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            // Legacy non-prestart demos — retired
            "Work Order Request — Dynamic Dropdown Demo",
            "Asset Maintenance Request (Demo)",
            "Equipment Fault Report (Demo)",
            "Abnormality Outcome to MEX (Demo)",
            "Sub Form Redirect Parent (Demo)",
            "Acknowledgement Sub Form (Demo)",
            "Forklift Pre-Start to MEX Flow (Demo)",       // superseded by DemoEquipmentMexFlowSeedData
            "Forklift Warning Acknowledgement (Demo)",
            // Simple (non-MEX) prestart forms — superseded by MEX flow demos
            "Forklift Pre-Start Checklist",
            "Reach Stacker Pre-Start Checklist",
            "Shuttle & Straddle Pre-Start Checklist",
            "Light Vehicle Pre-Start Checklist",
            "Quay Crane Pre-Start Checklist",
        };
}
