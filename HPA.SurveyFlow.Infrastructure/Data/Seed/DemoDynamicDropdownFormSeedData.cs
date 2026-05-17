using System.Text.Json;

namespace HPA.SurveyFlow.Infrastructure.Data.Seed;

/// <summary>
/// Demo form: "Work Order Request (Dynamic Dropdown Demo)"
///
/// Showcases the standard Formio select + dataSrc:url pattern
/// to populate a dropdown from the MEX Assets data source at render time.
///
/// The asset dropdown uses:
///   dataSrc: "url"
///   url:     /api/data-sources/query/mex
///   searchField: "q"   ← Formio appends ?q={user-input} automatically
///
/// This requires:
///   1. MEX integration configured + Asset Sync job run at least once
///   2. "mex-assets" DataSourceDefinition seeded (done by SeedDataSourceDefinitionsAsync)
/// </summary>
internal static class DemoDynamicDropdownFormSeedData
{
    public const string FormName = "Work Order Request — Dynamic Dropdown Demo";

    public static SeedForm Create()
    {
        var schema = new
        {
            display = "wizard",
            title = FormName,
            appSettings = new
            {
                publicDescription = "Demonstrates a form field populated live from MEX Assets. Select an asset from the dynamic dropdown, then describe the work required.",
                previewBeforeSubmit = true,
                allowSubmissionPdfExport = true,
                messageOnSuccess = "Your work order request has been submitted.",
                messageOnWarning = "Request submitted with warnings.",
                messageOnError = "Request submitted — please review flagged items.",
                secondarySubmit = new
                {
                    enabled = true,
                    integration = "mex",
                    action = "create_request",
                },
            },
            components = new object[]
            {
                // ── Step 1: Asset Selection (Dynamic Dropdown) ───────────────
                new
                {
                    type = "panel",
                    key = "step1_asset_selection",
                    title = "Step 1 — Asset Selection",
                    breadcrumb = "Asset",
                    label = "Asset",
                    components = new object[]
                    {
                        new
                        {
                            type = "htmlelement",
                            key = "infoBox",
                            tag = "div",
                            className = "alert alert-info",
                            content = "<strong>Dynamic dropdown demo:</strong> The <em>Asset</em> field below is populated live from your MEX Assets data source. Type to search. If the list is empty, run the <strong>MEX Asset Sync</strong> job first (Admin → Jobs).",
                        },

                        // ── THE KEY FIELD: standard Formio select, dataSrc:url ──
                        new
                        {
                            type = "select",
                            input = true,
                            key = "assetId",
                            label = "Asset",
                            placeholder = "Type to search assets…",
                            dataSrc = "url",
                            // Relative URL — rewritten to absolute by the Formio request plugin.
                            // Auth token injected by the same plugin; no headers needed in schema.
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
                            key = "requestedBy",
                            label = "Requested By",
                            validate = new { required = true },
                            input = true,
                        },
                        new
                        {
                            type = "textfield",
                            key = "contactEmail",
                            label = "Contact Email",
                            inputType = "email",
                            validate = new { required = true },
                            input = true,
                        },
                    },
                },

                // ── Step 2: Work Details ─────────────────────────────────────
                new
                {
                    type = "panel",
                    key = "step2_work_details",
                    title = "Step 2 — Work Details",
                    breadcrumb = "Work Details",
                    label = "Work Details",
                    components = new object[]
                    {
                        new
                        {
                            type = "select",
                            key = "workType",
                            label = "Type of Work",
                            validate = new { required = true },
                            input = true,
                            data = new
                            {
                                values = new[]
                                {
                                    new { label = "Preventive Maintenance", value = "preventive" },
                                    new { label = "Corrective Repair", value = "corrective" },
                                    new { label = "Inspection", value = "inspection" },
                                    new { label = "Calibration", value = "calibration" },
                                    new { label = "Emergency", value = "emergency" },
                                },
                            },
                            // Abnormality: anything not preventive or inspection is flagged as warning
                            properties = new
                            {
                                abnormal_enabled = true,
                                abnormal_normal_value = "preventive",
                                abnormal_level = "warning",
                            },
                        },
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
                                    new { label = "Low", value = "low" },
                                    new { label = "Medium", value = "medium" },
                                    new { label = "High", value = "high" },
                                    new { label = "Critical", value = "critical" },
                                },
                            },
                            properties = new
                            {
                                abnormal_enabled = true,
                                abnormal_normal_value = "low",
                                abnormal_level = "error",
                            },
                        },
                        new
                        {
                            type = "textarea",
                            key = "description",
                            label = "Work Description",
                            validate = new { required = true },
                            rows = 4,
                            input = true,
                        },
                        new
                        {
                            type = "datetime",
                            key = "requestedDate",
                            label = "Requested Completion Date",
                            validate = new { required = true },
                            input = true,
                            enableDate = true,
                            enableTime = false,
                            format = "dd/MM/yyyy",
                        },
                    },
                },

                // ── Step 3: Declaration ──────────────────────────────────────
                new
                {
                    type = "panel",
                    key = "step3_declaration",
                    title = "Step 3 — Declaration",
                    breadcrumb = "Declaration",
                    label = "Declaration",
                    components = new object[]
                    {
                        new
                        {
                            type = "textarea",
                            key = "additionalNotes",
                            label = "Additional Notes (optional)",
                            rows = 3,
                            input = true,
                        },
                        new
                        {
                            type = "checkbox",
                            key = "declaration",
                            label = "I confirm the information above is accurate and authorise this work order to be raised.",
                            validate = new { required = true },
                            input = true,
                        },
                    },
                },
            },
        };

        var json = JsonSerializer.SerializeToElement(schema,
            new JsonSerializerOptions(JsonSerializerDefaults.Web));
        return new SeedForm(FormName, json);
    }
}
