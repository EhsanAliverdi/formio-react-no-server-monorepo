using System.Text.Json;

namespace HPA.SurveyFlow.Infrastructure.Data.Seed;

/// <summary>
/// Demo "Asset Maintenance Request" form that showcases the SurveyFlow Data Source component.
/// The asset dropdown is populated dynamically from the MEX assets cache via /api/data-sources/assets.
/// </summary>
internal static class DemoAssetFormSeedData
{
    public const string FormName = "Asset Maintenance Request (Demo)";

    public static SeedForm Create()
    {
        var schema = new
        {
            display = "wizard",
            title = FormName,
            appSettings = new
            {
                publicDescription = "Raise a maintenance request for an asset. The asset list is populated live from MEX.",
                previewBeforeSubmit = true,
                allowSubmissionPdfExport = true,
                messageOnSuccess = "Your maintenance request has been submitted and forwarded to MEX.",
                messageOnWarning = "Request submitted with warnings.",
                messageOnError = "Request submitted — please review the flagged items.",
                secondarySubmit = new
                {
                    enabled = true,
                    integration = "mex",
                    action = "create_request",
                },
            },
            components = new object[]
            {
                // ── Step 1: Asset Selection ────────────────────────────────────
                new
                {
                    type = "panel",
                    key = "step1_asset",
                    title = "Step 1 – Asset",
                    breadcrumb = "Asset",
                    label = "Asset",
                    components = new object[]
                    {
                        // Standard Formio select with dataSrc:url — auth + URL rewriting handled by plugin
                        new
                        {
                            type = "select",
                            input = true,
                            key = "assetId",
                            label = "Select Asset",
                            placeholder = "Type to search assets…",
                            dataSrc = "url",
                            data = new { url = "/api/data-sources/query/mex" },
                            valueProperty = "value",
                            template = "<span>{{ item.label }}</span>",
                            searchEnabled = true,
                            searchField = "q",
                            lazyLoad = false,
                            validate = new { required = true },
                            properties = new { sfSourceKey = "mex-assets" },
                        },
                        new
                        {
                            type = "textfield",
                            key = "reporterName",
                            label = "Your Name",
                            validate = new { required = true },
                            input = true,
                        },
                        new
                        {
                            type = "textfield",
                            key = "reporterEmail",
                            label = "Your Email",
                            inputType = "email",
                            validate = new { required = true },
                            input = true,
                        },
                    },
                },

                // ── Step 2: Issue Details ──────────────────────────────────────
                new
                {
                    type = "panel",
                    key = "step2_issue",
                    title = "Step 2 – Issue Details",
                    breadcrumb = "Issue",
                    label = "Issue Details",
                    components = new object[]
                    {
                        new
                        {
                            type = "select",
                            key = "priority",
                            label = "Priority",
                            validate = new { required = true },
                            input = true,
                            data = new
                            {
                                values = new[]
                                {
                                    new { label = "Routine", value = "routine" },
                                    new { label = "Low", value = "low" },
                                    new { label = "Medium", value = "medium" },
                                    new { label = "High", value = "high" },
                                    new { label = "Critical — take out of service", value = "critical" },
                                },
                            },
                            // Abnormality: anything above routine is flagged as a warning
                            properties = new
                            {
                                abnormal_enabled = true,
                                abnormal_normal_value = "routine",
                                abnormal_level = "warning",
                            },
                        },
                        new
                        {
                            type = "textarea",
                            key = "description",
                            label = "Describe the issue",
                            validate = new { required = true },
                            rows = 4,
                            input = true,
                        },
                        new
                        {
                            type = "radio",
                            key = "assetOperational",
                            label = "Is the asset currently operational?",
                            validate = new { required = true },
                            input = true,
                            values = new[]
                            {
                                new { label = "Yes — still in service", value = "yes" },
                                new { label = "No — taken out of service", value = "no" },
                            },
                            // Abnormality: asset should be out of service when reporting
                            properties = new
                            {
                                abnormal_enabled = true,
                                abnormal_normal_value = "no",
                                abnormal_level = "error",
                            },
                        },
                    },
                },

                // ── Step 3: Declaration ────────────────────────────────────────
                new
                {
                    type = "panel",
                    key = "step3_declaration",
                    title = "Step 3 – Declaration",
                    breadcrumb = "Declaration",
                    label = "Declaration",
                    components = new object[]
                    {
                        new
                        {
                            type = "datetime",
                            key = "issueDiscoveredAt",
                            label = "When was the issue first noticed?",
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
                            label = "Immediate action taken (if any)",
                            input = true,
                            rows = 2,
                        },
                        new
                        {
                            type = "checkbox",
                            key = "declaration",
                            label = "I confirm the above information is accurate.",
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
}
