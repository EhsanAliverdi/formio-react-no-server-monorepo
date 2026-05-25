using System.Text.Json;

namespace HPA.SurveyFlow.Infrastructure.Data.Seed;

/// <summary>
/// Full forklift pre-start demo:
///   - warning abnormalities create a MEX request and open an acknowledgement form
///   - error abnormalities create a MEX request and stop operation
///   - MEX payload mapping overrides asset/requester/description/priority fields only
/// </summary>
internal static class DemoForkliftMexFlowSeedData
{
    public const string ParentFormName = "Forklift Pre-Start to MEX Flow (Demo)";
    public const string WarningAcknowledgementFormName = "Forklift Warning Acknowledgement (Demo)";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public static SeedForm CreateParent(int? warningAcknowledgementFormId = null)
    {
        var schema = new
        {
            type = "form",
            display = "wizard",
            title = ParentFormName,
            name = ParentFormName,
            path = "forklift-pre-start-mex-flow-demo",
            components = new object[]
            {
                Panel("step1_operator_machine", "Step 1 - Operator & Machine Details", "Operator & Machine Details",
                [
                    TextField("fullName", "Full Name", input: true),
                    TextField("employeeId", "Employee / Contractor ID", input: true),
                    MexAssetSelect("machineId", "Machine ID"),
                    FirstOperatorRadio("firstOperatorShift"),
                    DisplayText("firstOperatorInfo_no", "Info", "You are responsible for identifying and reporting any new or unresolved issues.", "firstOperatorShift", "no"),
                ]),
                Panel("step2_safety_systems", "Step 2 - Safety Systems", "Safety Systems",
                [
                    ErrorYesNo("beaconsWorking", "Are all beacons working correctly?", abnormalWhen: "no"),
                    Explain("beaconsWorking_explain", "beaconsWorking", "no"),
                    ErrorYesNo("gaugesWorking", "Are all gauges and instruments functioning correctly?", abnormalWhen: "no"),
                    Explain("gaugesWorking_explain", "gaugesWorking", "no"),
                    ErrorYesNo("seatAndBeltOk", "Is the seat secure and the seat belt fully operational?", abnormalWhen: "no"),
                    Explain("seatAndBeltOk_explain", "seatAndBeltOk", "no"),
                    ErrorYesNo("fireExtinguisherOk", "Is a fire extinguisher present, accessible, and within inspection date?", abnormalWhen: "no"),
                    Explain("fireExtinguisherOk_explain", "fireExtinguisherOk", "no"),
                    ErrorYesNo("hornAudible", "Is the horn clearly audible?", abnormalWhen: "no"),
                    Explain("hornAudible_explain", "hornAudible", "no"),
                    ErrorYesNo("safetyDevicesTampered", "Is there any evidence of safety devices being tampered with?", normal: "no", abnormalWhen: "yes"),
                    Explain("safetyDevicesTampered_explain", "safetyDevicesTampered", "yes"),
                    ErrorYesNo("loadChartLegible", "Is the load chart / data plate fitted and legible?", abnormalWhen: "no"),
                    Explain("loadChartLegible_explain", "loadChartLegible", "no"),
                ]),
                Panel("step3_wheels_tyres", "Step 3 - Wheels & Tyres", "Wheels & Tyres",
                [
                    WarningYesNo("tyresOrWheelsDamaged", "Is there any visible damage to tyres or wheels?", normal: "no", abnormalWhen: "yes"),
                    Explain("tyresOrWheelsDamaged_explain", "tyresOrWheelsDamaged", "yes", "If Yes - explain damage"),
                    WarningYesNo("tyresInflatedGood", "Are all tyres correctly inflated and in good condition?", abnormalWhen: "no"),
                    Explain("tyresInflatedGood_explain", "tyresInflatedGood", "no"),
                ]),
                Panel("step4_frame_mast_attachments", "Step 4 - Frame, Mast & Attachments", "Frame/Mast/Attachments",
                [
                    WarningYesNo("frameDamaged", "Is there any visible damage to the forklift frame or body?", normal: "no", abnormalWhen: "yes"),
                    Explain("frameDamaged_explain", "frameDamaged", "yes", "Please explain damage / location"),
                    WarningYesNo("mastSmoothNoCracksLeaks", "Is the mast operating smoothly with no visible cracks, bends, or leaks?", abnormalWhen: "no"),
                    Explain("mastSmoothNoCracksLeaks_explain", "mastSmoothNoCracksLeaks", "no"),
                ]),
                Panel("step5_brakes_controls", "Step 5 - Brakes & Controls", "Brakes & Controls",
                [
                    ErrorYesNo("brakesOk", "Are brakes working correctly?", abnormalWhen: "no"),
                    Explain("brakesOk_explain", "brakesOk", "no"),
                ]),
                Panel("step6_lights_visibility_access", "Step 6 - Lights, Visibility & Access", "Lights/Visibility/Access",
                [
                    WarningYesNo("lightsWorking", "Are all lights working correctly?", abnormalWhen: "no"),
                    Explain("lightsWorking_explain", "lightsWorking", "no"),
                ]),
                Panel("step7_general_condition", "Step 7 - General Condition & Housekeeping", "General Condition",
                [
                    WarningYesNo("cabinClean", "Is the cabin clean and clear?", abnormalWhen: "no"),
                    Explain("cabinClean_explain", "cabinClean", "no"),
                ]),
                Panel("step8_fault_details", "Step 8 - Fault Details & Evidence", "Fault Details",
                [
                    WarningYesNo("faultsFound", "Were any faults or damage identified?", normal: "no", abnormalWhen: "yes"),
                    TextArea("faultDetails", "Details of faults / damage", "faultsFound", "yes"),
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
                    },
                ]),
                Panel("step9_safe_to_operate", "Step 9 - Safe to Operate Declaration", "Safe to Operate",
                [
                    ErrorYesNo("safeToOperate", "Is this forklift safe to operate?", abnormalWhen: "no"),
                    TextArea("unsafeReason", "Reason forklift is unsafe", "safeToOperate", "no"),
                    DisplayText("unsafeSystemMessage", "System message", "Forklift must be isolated and reported to maintenance.", "safeToOperate", "no"),
                ]),
                Panel("step10_operator_declaration", "Step 10 - Operator Declaration", "Declaration",
                [
                    new
                    {
                        type = "textarea",
                        key = "declarationText",
                        label = "Declaration",
                        disabled = true,
                        defaultValue = "I confirm that I have completed this pre-start checklist accurately and will not operate this forklift if it is unsafe.",
                    },
                    TextField("operatorSignature", "Operator Signature (digital)"),
                ]),
            },
            appSettings = new
            {
                showIconInFormsList = true,
                formsListIconKey = "fa:FaTruckLoading",
                publicDescription = "Full forklift pre-start demo with abnormal rules, MEX create request payload mapping, warning acknowledgement flow, and error stop outcome.",
                previewBeforeSubmit = true,
                allowSubmissionPdfExport = true,
                showColorCodedAnswers = true,
                messageOnSuccess = "Forklift pre-start submitted. No abnormal answers were detected.",
                messageOnWarning = "Forklift pre-start submitted with {{warning_count}} warning issue(s). A MEX request has been created and you must complete the acknowledgement before operating.",
                messageOnError = "STOP. Forklift must not be operated. {{error_count}} critical safety issue(s) were detected and a MEX request has been created.",
                resultActions = new
                {
                    success = new { mode = "stay", delaySeconds = 0 },
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

        return new SeedForm(ParentFormName, JsonSerializer.SerializeToElement(schema, JsonOptions));
    }

    public static SeedForm CreateWarningAcknowledgement()
    {
        var schema = new
        {
            type = "form",
            display = "form",
            title = WarningAcknowledgementFormName,
            name = WarningAcknowledgementFormName,
            path = "forklift-warning-acknowledgement-demo",
            appSettings = new
            {
                publicDescription = "Acknowledgement required when the forklift pre-start has warning-level abnormalities.",
                messageOnSuccess = "Acknowledgement recorded. Operate only if site procedure allows and all warning issues have been reported.",
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

        return new SeedForm(WarningAcknowledgementFormName, JsonSerializer.SerializeToElement(schema, JsonOptions));
    }

    private static object SecondarySubmitConfig(int priorityNumber) =>
        new
        {
            enabled = true,
            integration = "mex",
            action = "create_request",
            fieldMappings = new
            {
                requesterDetails = new
                {
                    source = "template",
                    template = "Operator: {{field:fullName}}\nEmployee / Contractor ID: {{field:employeeId}}\nMachine: {{field:machineId}}\nOutcome: {{outcome}}\nSubmission: #{{submission_id}}",
                },
                priorityNumber = new { source = "static", value = priorityNumber },
                asset = new { source = "field", fieldKey = "machineId" },
                jobDescription = new
                {
                    source = "template",
                    template = "Forklift pre-start abnormal findings\n\nMachine: {{field:machineId}}\nOperator: {{field:fullName}} ({{field:employeeId}})\nOutcome: {{outcome}}\nSubmission: #{{submission_id}}\n\nWarning findings:\n{{warning_answers}}\n\nCritical stop findings:\n{{error_answers}}\n\nAll abnormal findings:\n{{abnormal_answers}}",
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

    private static object Select(string key, string label, IEnumerable<string> values) =>
        new
        {
            type = "select",
            key,
            label,
            validate = Required(),
            data = new
            {
                values = values.Select(value => new { label = value, value }).ToArray(),
            },
            input = true,
        };

    private static object MexAssetSelect(string key, string label) =>
        new
        {
            type = "select",
            input = true,
            key,
            label,
            placeholder = "Type to search MEX assets...",
            dataSrc = "url",
            data = new { url = "/api/data-sources/query/mex?parentId=10902&valueField=externalId" },
            valueProperty = "value",
            template = "<span>{{ item.label }}</span>",
            searchEnabled = true,
            searchField = "q",
            lazyLoad = false,
            validate = Required(),
            properties = new { sfSourceKey = "mex-assets", sfParentId = "10902", sfValueField = "externalId" },
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

    private static object Explain(string key, string when, string eq, string label = "Please explain why") =>
        TextArea(key, label, when, eq);

    private static object Required() => new { required = true };

    private static object Conditional(string when, string eq) => new { show = true, when, eq };
}
