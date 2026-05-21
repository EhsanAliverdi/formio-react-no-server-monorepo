using System.Text.Json;

namespace HPA.SurveyFlow.Infrastructure.Data.Seed;

/// <summary>
/// Demo "Equipment Fault Report" form that exercises every platform feature:
///   - 3 wizard steps
///   - Required field validation
///   - Abnormalities: error level (priority) and warning level (fault type)
///   - Submission result messages and redirect URLs (all three outcomes)
///   - Secondary submit to MEX (create_request)
///   - Preview before submit
///   - PDF export enabled
/// </summary>
internal static class DemoFaultReportSeedData
{
    public const string FormName = "Equipment Fault Report (Demo)";

    public static SeedForm Create()
    {
        var schema = new
        {
            display = "wizard",
            title = FormName,
            appSettings = new
            {
                publicDescription = "Report equipment faults and maintenance issues. Demonstrates abnormalities, integration submit, and result messages.",
                previewBeforeSubmit = true,
                allowSubmissionPdfExport = true,
                messageOnSuccess = "Thank you! Your fault report has been submitted and a maintenance request has been raised.",
                messageOnWarning = "Your report was submitted. Some answers indicate items to monitor — a maintenance request has been raised.",
                messageOnError = "Your report was submitted but contains critical fault flags. Maintenance has been notified.",
                redirectOnSuccess = (string?)null,
                redirectOnWarning = (string?)null,
                redirectOnError = (string?)null,
                secondarySubmit = new
                {
                    success = new { enabled = true, integration = "mex", action = "create_request" },
                    warning = new { enabled = true, integration = "mex", action = "create_request" },
                    error = new { enabled = true, integration = "mex", action = "create_request" },
                },
            },
            components = new object[]
            {
                // ── Step 1: Reporter & Equipment ────────────────────────────────
                new
                {
                    type = "panel",
                    key = "step1_reporter",
                    title = "Step 1 – Reporter & Equipment",
                    breadcrumb = "Reporter & Equipment",
                    label = "Reporter & Equipment",
                    components = new object[]
                    {
                        Field("reporterName", "Your Name"),
                        Field("reporterEmail", "Your Email", type: "email"),
                        Field("equipmentId", "Equipment ID / Tag Number"),
                        SelectField("equipmentType", "Equipment Type", new[]
                        {
                            "Forklift", "Reach Stacker", "Crane", "Light Vehicle", "Conveyor", "Other"
                        }),
                        SelectField("location", "Location / Area", new[]
                        {
                            "Yard A", "Yard B", "Workshop", "Wharf", "Gate", "Office"
                        }),
                    },
                },

                // ── Step 2: Fault Details ────────────────────────────────────────
                new
                {
                    type = "panel",
                    key = "step2_fault",
                    title = "Step 2 – Fault Details",
                    breadcrumb = "Fault Details",
                    label = "Fault Details",
                    components = new object[]
                    {
                        // priority — abnormality ERROR: "routine" is normal, anything else triggers error
                        new
                        {
                            type = "select",
                            key = "priority",
                            label = "Fault Priority",
                            validate = new { required = true },
                            input = true,
                            data = new
                            {
                                values = new[]
                                {
                                    new { label = "Routine (no immediate action)", value = "routine" },
                                    new { label = "Low (monitor)", value = "low" },
                                    new { label = "Medium (schedule repair)", value = "medium" },
                                    new { label = "High (repair ASAP)", value = "high" },
                                    new { label = "Critical (take out of service)", value = "critical" },
                                },
                            },
                            properties = new
                            {
                                abnormal_enabled = true,
                                abnormal_normal_value = "routine",
                                abnormal_level = "error",
                            },
                        },

                        // faultType — abnormality WARNING: "wear" is normal; structural/electrical trigger warning
                        new
                        {
                            type = "select",
                            key = "faultType",
                            label = "Fault Type",
                            validate = new { required = true },
                            input = true,
                            data = new
                            {
                                values = new[]
                                {
                                    new { label = "Normal wear and tear", value = "wear" },
                                    new { label = "Electrical fault", value = "electrical" },
                                    new { label = "Hydraulic leak", value = "hydraulic" },
                                    new { label = "Structural damage", value = "structural" },
                                    new { label = "Safety device failure", value = "safety" },
                                },
                            },
                            properties = new
                            {
                                abnormal_enabled = true,
                                abnormal_normal_value = "wear",
                                abnormal_level = "warning",
                            },
                        },

                        new
                        {
                            type = "textarea",
                            key = "description",
                            label = "Describe the fault in detail",
                            validate = new { required = true },
                            input = true,
                            rows = 4,
                        },

                        new
                        {
                            type = "radio",
                            key = "equipmentInService",
                            label = "Is the equipment currently in service?",
                            validate = new { required = true },
                            input = true,
                            values = new[]
                            {
                                new { label = "Yes — still operating", value = "yes" },
                                new { label = "No — taken out of service", value = "no" },
                            },
                            // abnormality ERROR: equipment should be out of service when reporting a fault
                            properties = new
                            {
                                abnormal_enabled = true,
                                abnormal_normal_value = "no",
                                abnormal_level = "error",
                            },
                        },
                    },
                },

                // ── Step 3: Review & Declaration ────────────────────────────────
                new
                {
                    type = "panel",
                    key = "step3_declaration",
                    title = "Step 3 – Additional Info & Declaration",
                    breadcrumb = "Declaration",
                    label = "Declaration",
                    components = new object[]
                    {
                        new
                        {
                            type = "datetime",
                            key = "faultDiscoveredAt",
                            label = "When was the fault first noticed?",
                            validate = new { required = true },
                            input = true,
                            format = "dd/MM/yyyy HH:mm",
                            enableDate = true,
                            enableTime = true,
                        },
                        new
                        {
                            type = "textarea",
                            key = "immediateAction",
                            label = "What immediate action was taken (if any)?",
                            input = true,
                            rows = 3,
                        },
                        new
                        {
                            type = "radio",
                            key = "safeToOperate",
                            label = "In your assessment, is the equipment safe to operate?",
                            validate = new { required = true },
                            input = true,
                            values = new[]
                            {
                                new { label = "Yes — safe to operate with caution", value = "yes_caution" },
                                new { label = "No — must not be operated", value = "no" },
                            },
                        },
                        new
                        {
                            type = "checkbox",
                            key = "declaration",
                            label = "I declare that the information provided is accurate and complete to the best of my knowledge.",
                            validate = new { required = true },
                            input = true,
                        },
                    },
                },
            },
        };

        var json = JsonSerializer.SerializeToElement(schema, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        return new SeedForm(FormName, json);
    }

    private static object Field(string key, string label, string type = "textfield") =>
        new { type, key, label, validate = new { required = true }, input = true };

    private static object SelectField(string key, string label, string[] options) =>
        new
        {
            type = "select",
            key,
            label,
            validate = new { required = true },
            input = true,
            data = new { values = options.Select(o => new { label = o, value = o.ToLowerInvariant().Replace(" ", "_") }).ToArray() },
        };
}
