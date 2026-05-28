using System.Text.Json;

namespace HPA.SurveyFlow.Infrastructure.Data.Seed;

internal static class DemoEquipmentMexFlowSeedData
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public static readonly EquipmentDemoDefinition[] Definitions =
    [
        new("Forklift Pre-Start to MEX Flow (Demo)", "Forklift Warning Acknowledgement (Demo)", "forklift-pre-start-mex-flow-demo", "forklift", "10902", "fa:FaTruckLoading",
            "Forklift must be isolated and reported to maintenance.", "Forklift.png"),
        new("Reach Stacker Pre-Start Checklist (Demo)", "Reach Stacker Warning Acknowledgement (Demo)", "reach-stacker-pre-start-mex-flow-demo", "reach stacker", "1075", "fa:FaWarehouse",
            "Reach stacker must be isolated and reported to maintenance.", "Reach Stacker.png"),
        new("Shuttle & Straddle Pre-Start Checklist (Demo)", "Shuttle & Straddle Warning Acknowledgement (Demo)", "shuttle-straddle-pre-start-mex-flow-demo", "shuttle/straddle carrier", "1076", "fa:FaTruckMoving",
            "Equipment must be isolated and reported to maintenance.", "Shuttle.png"),
        new("Light Vehicle Pre-Start Checklist (Demo)", "Light Vehicle Warning Acknowledgement (Demo)", "light-vehicle-pre-start-mex-flow-demo", "light vehicle", "73", "fa:FaCar",
            "Vehicle must be isolated and reported to maintenance.", "Light Vehicle.png"),
        new("Quay Crane Pre-Start Checklist (Demo)", "Quay Crane Warning Acknowledgement (Demo)", "quay-crane-pre-start-mex-flow-demo", "quay crane", "1074", "fa:FaIndustry",
            "Quay crane must be isolated and reported to maintenance.", "Quay Crane.png"),
    ];

    public static IReadOnlyList<SeedForm> CreateInitialForms() =>
        Definitions
            .SelectMany(d => new[] { CreateParent(d), CreateWarningAcknowledgement(d) })
            .ToList();

    public static SeedForm CreateParent(EquipmentDemoDefinition d, int? warningAcknowledgementFormId = null)
    {
        var titleName = ToTitle(d.EquipmentName);
        var schema = new
        {
            type = "form",
            display = "wizard",
            title = d.ParentFormName,
            name = d.ParentFormName,
            path = d.Path,
            components = new object[]
            {
                Panel("step1_operator_machine", $"Step 1 - Operator & {titleName} Details", "Operator & Machine",
                [
                    TextField("fullName", "Full Name", input: true),
                    TextField("employeeId", "Employee / Contractor ID", input: true),
                    MexAssetSelect("machineId", $"{titleName} ID", d.MexParentAssetId),
                    FirstOperatorRadio("firstOperatorShift"),
                    DisplayText("firstOperatorInfo_no", "Info", "You are responsible for identifying and reporting any new or unresolved issues.", "firstOperatorShift", "no"),
                ]),
                Panel("step2_safety_systems", "Step 2 - Safety Systems", "Safety Systems",
                [
                    ErrorYesNo("beaconsWorking", "Are all beacons / warning devices working correctly?", abnormalWhen: "no"),
                    Explain("beaconsWorking_explain", "beaconsWorking", "no"),
                    ErrorYesNo("gaugesWorking", "Are all gauges and instruments functioning correctly?", abnormalWhen: "no"),
                    Explain("gaugesWorking_explain", "gaugesWorking", "no"),
                    ErrorYesNo("seatAndBeltOk", "Is the seat secure and the seat belt fully operational?", abnormalWhen: "no"),
                    Explain("seatAndBeltOk_explain", "seatAndBeltOk", "no"),
                    ErrorYesNo("hornAudible", "Is the horn clearly audible?", abnormalWhen: "no"),
                    Explain("hornAudible_explain", "hornAudible", "no"),
                    ErrorYesNo("safetyDevicesTampered", "Is there any evidence of safety devices being tampered with?", normal: "no", abnormalWhen: "yes"),
                    Explain("safetyDevicesTampered_explain", "safetyDevicesTampered", "yes"),
                ]),
                Panel("step3_condition", "Step 3 - General Condition", "Condition",
                [
                    WarningYesNo("visibleDamage", $"Is there any visible damage to the {d.EquipmentName}?", normal: "no", abnormalWhen: "yes"),
                    Explain("visibleDamage_explain", "visibleDamage", "yes", "Please explain damage / location"),
                    WarningYesNo("tyresOrWheelsDamaged", "Is there any visible damage to tyres, wheels, tracks, or travel gear?", normal: "no", abnormalWhen: "yes"),
                    Explain("tyresOrWheelsDamaged_explain", "tyresOrWheelsDamaged", "yes", "Please explain damage"),
                    WarningYesNo("leaksVisible", "Are there any visible leaks?", normal: "no", abnormalWhen: "yes"),
                    Explain("leaksVisible_explain", "leaksVisible", "yes", "Please describe the leak"),
                    WarningYesNo("cabinClean", "Is the cabin clean and clear?", abnormalWhen: "no"),
                    Explain("cabinClean_explain", "cabinClean", "no"),
                ]),
                Panel("step4_brakes_controls", "Step 4 - Brakes & Controls", "Brakes & Controls",
                [
                    ErrorYesNo("brakesOk", "Are brakes working correctly?", abnormalWhen: "no"),
                    Explain("brakesOk_explain", "brakesOk", "no"),
                    ErrorYesNo("steeringControlsOk", "Are steering and operating controls working correctly?", abnormalWhen: "no"),
                    Explain("steeringControlsOk_explain", "steeringControlsOk", "no"),
                ]),
                Panel("step5_fault_details", "Step 5 - Fault Details & Evidence", "Fault Details",
                [
                    WarningYesNo("faultsFound", "Were any faults or damage identified?", normal: "no", abnormalWhen: "yes"),
                    TextArea("faultDetails", "Details of faults / damage", "faultsFound", "yes"),
                    UrgencyLevel(),
                ]),
                Panel("step6_safe_to_operate", "Step 6 - Safe to Operate Declaration", "Safe to Operate",
                [
                    ErrorYesNo("safeToOperate", $"Is this {d.EquipmentName} safe to operate?", abnormalWhen: "no"),
                    TextArea("unsafeReason", $"Reason {d.EquipmentName} is unsafe", "safeToOperate", "no"),
                    DisplayText("unsafeSystemMessage", "System message", d.UnsafeMessage, "safeToOperate", "no"),
                ]),
                Panel("step7_operator_declaration", "Step 7 - Operator Declaration", "Declaration",
                [
                    new
                    {
                        type = "textarea",
                        key = "declarationText",
                        label = "Declaration",
                        disabled = true,
                        defaultValue = $"I confirm that I have completed this pre-start checklist accurately and will not operate this {d.EquipmentName} if it is unsafe.",
                    },
                    TextField("operatorSignature", "Operator Signature (digital)"),
                ]),
            },
            appSettings = new
            {
                categorySlug = "pre-start",
                categoryName = "Pre-Start",
                showIconInFormsList = true,
                formsListIconKey = d.IconKey,
                categoryIcon = d.IconKey,
                publicDescription = $"Pre-start demo for {d.EquipmentName} with MEX asset selection, abnormal rules, MEX create request mapping, warning acknowledgement flow, and error stop outcome.",
                previewBeforeSubmit = true,
                allowSubmissionPdfExport = true,
                showColorCodedAnswers = true,
                messageOnSuccess = "Pre-start submitted. No abnormal answers were detected. Returning to the pre-start menu in {{countdown}} seconds…",
                messageOnWarning = "Pre-start submitted with {{warning_count}} warning issue(s). A MEX request has been created and you must complete the acknowledgement before operating.",
                messageOnError = "STOP. Equipment must not be operated. {{error_count}} critical safety issue(s) were detected and a MEX request has been created.",
                redirectOnSuccess = "/category/pre-start",
                resultActions = new
                {
                    success = new { mode = "redirect", delaySeconds = 10 },
                    warning = new { mode = "next_form", delaySeconds = 1 },
                    error = new { mode = "stay", delaySeconds = 0 },
                },
                nextForms = new
                {
                    success = (int?)null,
                    warning = warningAcknowledgementFormId,
                    error = (int?)null,
                },
                secondarySubmit = new
                {
                    success = new { enabled = false, integration = "mex", action = "create_request" },
                    warning = SecondarySubmitConfig(priorityNumber: 2),
                    error = SecondarySubmitConfig(priorityNumber: 1),
                },
            },
        };

        return new SeedForm(d.ParentFormName, JsonSerializer.SerializeToElement(schema, JsonOptions));
    }

    public static SeedForm CreateWarningAcknowledgement(EquipmentDemoDefinition d)
    {
        var schema = new
        {
            type = "form",
            display = "form",
            title = d.AcknowledgementFormName,
            name = d.AcknowledgementFormName,
            path = $"{d.Path}-warning-acknowledgement",
            appSettings = new
            {
                publicDescription = $"Acknowledgement required when the {d.EquipmentName} pre-start has warning-level abnormalities.",
                categorySlug = "pre-start",
                categoryName = "Pre-Start",
                messageOnSuccess = "Acknowledgement recorded. Operate only if site procedure allows and all warning issues have been reported. Returning to the pre-start menu in {{countdown}} seconds…",
                redirectOnSuccess = "/category/pre-start",
                resultActions = new
                {
                    success = new { mode = "redirect", delaySeconds = 10 },
                    warning = new { mode = "stay", delaySeconds = 0 },
                    error = new { mode = "stay", delaySeconds = 0 },
                },
            },
            components = new object[]
            {
                new
                {
                    type = "textarea",
                    key = "reportedIssuesAcknowledgement",
                    label = "Warning acknowledgement",
                    defaultValue = "I acknowledge the warning issues have been reported and I will follow site procedure before operating.",
                    validate = Required(),
                    input = true,
                },
                new
                {
                    type = "checkbox",
                    key = "operatorAcknowledged",
                    label = "I understand I am responsible for monitoring and reporting these issues before operating.",
                    validate = Required(),
                    input = true,
                },
                TextField("acknowledgedBy", "Acknowledged by"),
            },
        };

        return new SeedForm(d.AcknowledgementFormName, JsonSerializer.SerializeToElement(schema, JsonOptions));
    }

    private static object SecondarySubmitConfig(int priorityNumber) =>
        new
        {
            enabled = true,
            integration = "mex",
            action = "create_request",
            responseRefField = "requestNumber",
            fieldMappings = new
            {
                priorityNumber = new { source = "static", value = priorityNumber },
                asset = new { source = "field", fieldKey = "machineId" },
                requesterDetails = new
                {
                    source = "template",
                    template = "Operator: {{field:fullName}}\nEmployee / Contractor ID: {{field:employeeId}}\nAsset: {{asset_display}}\nOutcome: {{outcome}}\nSubmission: #{{submission_id}}",
                },
                jobDescription = new
                {
                    source = "template",
                    template = "Pre-start abnormal findings\n\nAsset: {{asset_display}}\nOperator: {{field:fullName}} ({{field:employeeId}})\nOutcome: {{outcome}}\nSubmission: #{{submission_id}}\n\nWarning findings:\n{{warning_answers}}\n\nCritical stop findings:\n{{error_answers}}\n\nAll abnormal findings:\n{{abnormal_answers}}",
                },
            },
        };

    private static object Panel(string key, string title, string breadcrumb, object[] components) =>
        new { type = "panel", key, title, breadcrumb, components };

    private static object TextField(string key, string label, bool input = true) =>
        new { type = "textfield", key, label, validate = Required(), input };

    private static object TextArea(string key, string label, string when, string eq) =>
        new { type = "textarea", key, label, conditional = Conditional(when, eq), validate = Required(), input = true };

    private static object DisplayText(string key, string label, string defaultValue, string when, string eq) =>
        new { type = "textarea", key, label, disabled = true, defaultValue, conditional = Conditional(when, eq) };

    private static object MexAssetSelect(string key, string label, string parentId) =>
        new
        {
            type = "select",
            input = true,
            key,
            label,
            placeholder = "Type to search machines...",
            dataSrc = "url",
            data = new { url = $"/api/data-sources/query/mex?parentId={parentId}&valueField=externalId" },
            valueProperty = "value",
            template = "<span>{{ item.assetNumber || item.label }}</span>",
            searchEnabled = true,
            searchField = "q",
            lazyLoad = false,
            validate = Required(),
            properties = new { sfSourceKey = "mex-assets", sfParentId = parentId, sfValueField = "externalId" },
        };

    private static object FirstOperatorRadio(string key) =>
        new
        {
            type = "radio",
            key,
            label = "Are you the first operator of this shift?",
            validate = Required(),
            values = new[]
            {
                new { label = "Yes", value = "yes" },
                new { label = "No", value = "no" },
                new { label = "No, but I would like to complete a Pre-Start Checklist", value = "no_complete" },
            },
            input = true,
        };

    private static object ErrorYesNo(string key, string label, string normal = "yes", string abnormalWhen = "no") =>
        YesNoWithAbnormality(key, label, normal, abnormalWhen, "error");

    private static object WarningYesNo(string key, string label, string normal = "yes", string abnormalWhen = "no") =>
        YesNoWithAbnormality(key, label, normal, abnormalWhen, "warning");

    private static object YesNoWithAbnormality(string key, string label, string normal, string abnormalWhen, string level) =>
        new
        {
            type = "radio",
            key,
            label,
            validate = Required(),
            values = new[]
            {
                new { label = "Yes", value = "yes" },
                new { label = "No", value = "no" },
            },
            properties = new
            {
                abnormal_enabled = true,
                abnormal_normal_values = new object[] { new { value = normal } },
                abnormal_error_values = level == "error" ? new object[] { new { value = abnormalWhen } } : [],
                abnormal_warning_values = level == "warning" ? new object[] { new { value = abnormalWhen } } : [],
                abnormal_default_level = "none",
            },
        };

    private static object UrgencyLevel() =>
        new
        {
            type = "radio",
            key = "urgencyLevel",
            label = "Urgency level",
            conditional = Conditional("faultsFound", "yes"),
            validate = Required(),
            values = new[]
            {
                new { label = "Minor - monitor", value = "minor" },
                new { label = "Major - maintenance required", value = "major" },
                new { label = "Critical - do not operate", value = "critical" },
            },
            properties = new
            {
                abnormal_enabled = true,
                abnormal_normal_values = new[] { new { value = "minor" } },
                abnormal_warning_values = new[] { new { value = "major" } },
                abnormal_error_values = new[] { new { value = "critical" } },
                abnormal_default_level = "none",
            },
        };

    private static object Explain(string key, string when, string eq, string label = "Please explain why") =>
        TextArea(key, label, when, eq);

    private static object Required() => new { required = true };

    private static object Conditional(string when, string eq) => new { show = true, when, eq };

    private static string ToTitle(string value) =>
        string.Join(" ", value.Split(' ', '/', StringSplitOptions.RemoveEmptyEntries).Select(w => char.ToUpperInvariant(w[0]) + w[1..]));
}

internal sealed record EquipmentDemoDefinition(
    string ParentFormName,
    string AcknowledgementFormName,
    string Path,
    string EquipmentName,
    string MexParentAssetId,
    string IconKey,
    string UnsafeMessage,
    string? SeedImageFileName = null);
