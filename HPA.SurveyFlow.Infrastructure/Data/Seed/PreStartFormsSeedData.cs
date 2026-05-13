using System.Text.Json;

namespace HPA.SurveyFlow.Infrastructure.Data.Seed;

internal sealed record SeedForm(string Name, JsonElement Schema);

internal static class PreStartFormsSeedData
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public static IReadOnlyList<SeedForm> Forms { get; } =
    [
        CreateForkliftPreStartChecklist(),
        CreateReachStackerPreStartChecklist(),
        CreateShuttleStraddlePreStartChecklist(),
        CreateLightVehiclePreStartChecklist(),
        CreateQuayCranePreStartChecklist(),
    ];

    private static SeedForm CreateForkliftPreStartChecklist()
    {
        const string name = "Forklift Pre-Start Checklist";

        return Form(name, "forklift-pre-start-checklist",
        [
            OperatorMachinePanel("Step 1 – Operator & Machine Details", "Operator & Machine Details", "FL", 1, 5, includeEmployeeId: true, infoKey: "firstOperatorInfo_no"),
            Panel("step2_safety_systems", "Step 2 – Safety Systems", "Safety Systems",
            [
                YesNo("beaconsWorking", "Are all beacons working correctly?"),
                Explain("beaconsWorking_explain", "beaconsWorking", "no"),
                YesNo("gaugesWorking", "Are all gauges and instruments functioning correctly?"),
                Explain("gaugesWorking_explain", "gaugesWorking", "no"),
                YesNo("seatAndBeltOk", "Is the seat secure and the seat belt fully operational?"),
                Explain("seatAndBeltOk_explain", "seatAndBeltOk", "no"),
                YesNo("fireExtinguisherOk", "Is a fire extinguisher present, accessible, and within inspection date?"),
                Explain("fireExtinguisherOk_explain", "fireExtinguisherOk", "no"),
                YesNo("hornAudible", "Is the horn clearly audible?"),
                Explain("hornAudible_explain", "hornAudible", "no"),
                YesNo("safetyDevicesTampered", "Is there any evidence of safety devices being tampered with?"),
                Explain("safetyDevicesTampered_explain", "safetyDevicesTampered", "yes"),
                YesNo("loadChartLegible", "Is the load chart / data plate fitted and legible?"),
                Explain("loadChartLegible_explain", "loadChartLegible", "no"),
            ]),
            Panel("step3_wheels_tyres", "Step 3 – Wheels & Tyres", "Wheels & Tyres",
            [
                YesNo("tyresOrWheelsDamaged", "Is there any visible damage to tyres or wheels?"),
                Explain("tyresOrWheelsDamaged_explain", "tyresOrWheelsDamaged", "yes", "If Yes → explain damage"),
                YesNo("tyresInflatedGood", "Are all tyres correctly inflated and in good condition?"),
                Explain("tyresInflatedGood_explain", "tyresInflatedGood", "no"),
            ]),
            Panel("step4_frame_mast_attachments", "Step 4 – Frame, Mast & Attachments", "Frame/Mast/Attachments",
            [
                YesNo("frameDamaged", "Is there any visible damage to the forklift frame or body?"),
                Explain("frameDamaged_explain", "frameDamaged", "yes", "Please explain (damage / location)"),
                YesNo("mastSmoothNoCracksLeaks", "Is the mast operating smoothly with no visible cracks, bends, or leaks?"),
                Explain("mastSmoothNoCracksLeaks_explain", "mastSmoothNoCracksLeaks", "no"),
            ]),
            Panel("step5_brakes_controls", "Step 5 – Brakes & Controls", "Brakes & Controls",
            [
                YesNo("brakesOk", "Are brakes working correctly?"),
                Explain("brakesOk_explain", "brakesOk", "no"),
            ]),
            Panel("step6_lights_visibility_access", "Step 6 – Lights, Visibility & Access", "Lights/Visibility/Access",
            [
                YesNo("lightsWorking", "Are all lights working correctly?"),
                Explain("lightsWorking_explain", "lightsWorking", "no"),
            ]),
            Panel("step7_general_condition", "Step 7 – General Condition & Housekeeping", "General Condition",
            [
                YesNo("cabinClean", "Is the cabin clean and clear?"),
                Explain("cabinClean_explain", "cabinClean", "no"),
            ]),
            FaultDetailsPanel("step8_fault_details", "Step 8 – Fault Details & Evidence"),
            SafeToOperatePanel("step9_safe_to_operate", "Step 9 – Safe to Operate Declaration", "forklift", "Reason forklift is unsafe", "Forklift must be isolated and reported to maintenance."),
            DeclarationPanel("step10_operator_declaration", "Step 10 – Operator Declaration", "I confirm that I have completed this pre-start checklist accurately and will not operate this forklift if it is unsafe."),
        ], "fa:FaAccessibleIcon", "A structured pre-start forklift inspection checklist guiding operators through safety, mechanical condition, faults, and declarations to ensure equipment is safe before operation.");
    }

    private static SeedForm CreateReachStackerPreStartChecklist()
    {
        const string name = "Reach Stacker Pre-Start Checklist";

        return Form(name, "reach-stacker-prestart",
        [
            OperatorMachinePanel("Step 1 – Operator & Machine Details", "Operator & Machine", "RS", 1, 6),
            Panel("step2_general_condition", "Step 2 – General Condition & Access", "General Condition",
            [
                YesNo("groundChecksCompleted", "Have ground level checks been completed?"),
                Explain("groundChecksCompleted_explain", "groundChecksCompleted", "no"),
                YesNo("visibleDamage", "Is there any visible damage evident?"),
                Explain("visibleDamage_explain", "visibleDamage", "yes", "If Yes → describe damage"),
                YesNo("stairsServiceable", "Are stairs and handrails in good condition?"),
                Explain("stairsServiceable_explain", "stairsServiceable", "no"),
            ]),
            Panel("step3_operator_safety", "Step 3 – Operator Safety Systems", "Safety Systems",
            [
                YesNo("seatAndBeltOk", "Is the seat and seat belt in good condition?"),
                Explain("seatAndBeltOk_explain", "seatAndBeltOk", "no"),
                YesNo("hornAudible", "Is the horn clearly audible?"),
                Explain("hornAudible_explain", "hornAudible", "no"),
            ]),
            Panel("step4_brakes_controls", "Step 4 – Brakes & Controls", "Brakes & Controls",
            [
                YesNo("brakesOk", "Are brakes working correctly?"),
                Explain("brakesOk_explain", "brakesOk", "no"),
            ]),
            FaultDetailsPanel("step5_fault_details", "Step 5 – Fault Details & Evidence"),
            SafeToOperatePanel("step6_safe_to_operate", "Step 6 – Safe to Operate Declaration", "reach stacker", "Reason reach stacker is unsafe", "Reach stacker must be isolated and reported to maintenance."),
            DeclarationPanel("step7_operator_declaration", "Step 7 – Operator Declaration", "I confirm that I have completed this pre-start checklist accurately and will not operate this reach stacker if it is unsafe."),
        ], "fa:FaWarehouse", "A structured reach stacker pre-start checklist ensuring safe operation, system integrity, and fault reporting before equipment use.");
    }

    private static SeedForm CreateShuttleStraddlePreStartChecklist()
    {
        const string name = "Shuttle & Straddle Pre-Start Checklist";

        return Form(name, "shuttle-straddle-prestart",
        [
            OperatorMachinePanel("Step 1 – Operator & Machine Details", "Operator & Machine", machineIds: ["SC01", "SC02", "SC03", "SC04", "SC05", "SC06", "SC07", "SC08", "SC11", "SC12", "SC21", "SC22", "SC23"]),
            Panel("step2_ground_tyres", "Step 2 – Ground & Tyres", "Ground & Tyres",
            [
                YesNo("groundChecksCompleted", "Have ground level checks been completed?"),
                Explain("groundChecksCompleted_explain", "groundChecksCompleted", "no"),
                YesNo("tyresOk", "Are tyres in good condition?"),
                Explain("tyresOk_explain", "tyresOk", "no"),
            ]),
            Panel("step3_safety_systems", "Step 3 – Safety Systems", "Safety Systems",
            [
                YesNo("oilLeaksVisible", "Are there any signs of oil leaks?"),
                Explain("oilLeaksVisible_explain", "oilLeaksVisible", "yes", "If Yes → describe leak"),
                YesNo("fireExtinguisherOk", "Is a fire extinguisher available and checked?"),
                Explain("fireExtinguisherOk_explain", "fireExtinguisherOk", "no"),
                YesNo("safetyDevicesTampered", "Any evidence of safety devices being tampered with or missing?"),
                Explain("safetyDevicesTampered_explain", "safetyDevicesTampered", "yes", "If Yes → describe issue"),
            ]),
            FaultDetailsPanel("step4_fault_details", "Step 4 – Fault Details & Evidence"),
            SafeToOperatePanel("step5_safe_to_operate", "Step 5 – Safe to Operate Declaration", "shuttle/straddle carrier", "Reason equipment is unsafe", "Equipment must be isolated and reported to maintenance."),
            DeclarationPanel("step6_operator_declaration", "Step 6 – Operator Declaration", "I confirm that I have completed this pre-start checklist accurately and will not operate this shuttle or straddle carrier if it is unsafe."),
        ], "fa:FaTruckMoving", "A structured shuttle and straddle pre-start checklist ensuring safety compliance, fault reporting, and safe operation before equipment use.");
    }

    private static SeedForm CreateLightVehiclePreStartChecklist()
    {
        const string name = "Light Vehicle Pre-Start Checklist";

        return Form(name, "light-vehicle-prestart",
        [
            Panel("step1_operator_vehicle", "Step 1 – Operator & Vehicle Details", "Operator & Vehicle",
            [
                TextField("fullName", "Full Name", input: true),
                new { type = "email", key = "email", label = "Email", validate = Required(), input = true },
                new { type = "datetime", key = "date", label = "Date", disabled = true, calculateValue = "value = new Date();", input = true },
                Select("vehicleId", "Vehicle ID", ["CAR30", "CAR31", "CAR32", "CAR33", "CAR40", "CAR50", "CAR55", "CAR60", "CAR61", "CAR62", "CAR63", "CAR64", "CAR65", "CAR66", "CAR67", "CAR68", "CAR69", "TT01", "TT12", "TT13", "TT16"]),
                FirstOperatorRadio("firstOperator"),
            ]),
            Panel("step2_safety_checks", "Step 2 – Safety Checks", "Safety Checks",
            [
                YesNo("beaconsWorking", "Are all beacons working correctly?"),
                Explain("beaconsWorking_explain", "beaconsWorking", "no"),
                YesNo("fireExtinguisherOk", "Is a fire extinguisher available and within inspection date?"),
                Explain("fireExtinguisherOk_explain", "fireExtinguisherOk", "no"),
                YesNo("hornAudible", "Is the horn clearly audible?"),
                Explain("hornAudible_explain", "hornAudible", "no"),
            ]),
            Panel("step3_vehicle_condition", "Step 3 – Vehicle Condition", "Vehicle Condition",
            [
                YesNo("tyresOk", "Are tyres in good condition?"),
                Explain("tyresOk_explain", "tyresOk", "no"),
                YesNo("leaksVisible", "Are there any visible leaks?"),
                Explain("leaksVisible_explain", "leaksVisible", "yes", "If Yes → describe leak"),
                YesNo("brakesOk", "Are the brakes working correctly?"),
                Explain("brakesOk_explain", "brakesOk", "no"),
            ]),
            SafeToOperatePanel("step4_safe_to_operate", "Step 4 – Safe to Operate Declaration", "vehicle", "Reason vehicle is unsafe", "Vehicle must be isolated and reported to maintenance."),
            DeclarationPanel("step5_operator_declaration", "Step 5 – Operator Declaration", "I confirm that I have completed this pre-start checklist accurately and will not operate this vehicle if it is unsafe.", includeDateTime: true),
        ], "fa:FaCarSide", "A structured light vehicle pre-start checklist ensuring safety, compliance, and fault reporting before vehicle operation.");
    }

    private static SeedForm CreateQuayCranePreStartChecklist()
    {
        const string name = "Quay Crane Pre-Start Checklist";

        return Form(name, "quay-crane-prestart",
        [
            OperatorMachinePanel("Step 1 – Operator & Crane Details", "Operator & Crane", "QC", 1, 4, machineLabel: "Crane ID"),
            Panel("step2_working_area_access", "Step 2 – Working Area & Access", "Working Area",
            [
                YesNo("tracksClear", "Tracks clear of obstructions and cable reel tracking correctly?"),
                Explain("tracksClear_explain", "tracksClear", "no"),
                YesNo("workingAreaClear", "Working area clear of obstructions and storm pins correctly positioned?"),
                Explain("workingAreaClear_explain", "workingAreaClear", "no"),
            ]),
            Panel("step3_safety_systems", "Step 3 – Safety & Access Systems", "Safety Systems",
            [
                YesNo("sirensAudible", "Long travel sirens / squawkers audible?"),
                Explain("sirensAudible_explain", "sirensAudible", "no"),
                YesNo("stairsServiceable", "Stairs and handrails in a serviceable condition?"),
                Explain("stairsServiceable_explain", "stairsServiceable", "no"),
                YesNo("accessGatesOk", "Access gates operating and locking correctly?"),
                Explain("accessGatesOk_explain", "accessGatesOk", "no"),
                YesNo("elevatorOk", "Access elevator / hoist operating correctly?"),
                Explain("elevatorOk_explain", "elevatorOk", "no"),
            ]),
            Panel("step4_spreader_condition", "Step 4 – Spreader Condition & Function", "Spreader",
            [
                YesNo("spreaderDamage", "Is there any visible damage to the spreader?"),
                Explain("spreaderDamage_explain", "spreaderDamage", "yes", "If Yes → describe damage"),
                YesNo("spreaderFunctionOk", "Is the spreader functioning correctly?"),
                Explain("spreaderFunctionOk_explain", "spreaderFunctionOk", "no"),
            ]),
            FaultDetailsPanel("step5_fault_details", "Step 5 – Fault Details & Evidence"),
            SafeToOperatePanel("step6_safe_to_operate", "Step 6 – Safe to Operate Declaration", "quay crane", "Reason crane is unsafe", "Crane must be isolated and reported to maintenance."),
            DeclarationPanel("step7_operator_declaration", "Step 7 – Operator Declaration", "I confirm that I have completed this pre-start checklist accurately and will not operate this quay crane if it is unsafe."),
        ], "fa:FaIndustry", "A structured quay crane pre-start checklist ensuring safe operation, system integrity, and fault reporting before crane use.");
    }

    private static SeedForm Form(string name, string path, object[] components, string iconKey, string publicDescription)
    {
        var schema = new
        {
            type = "form",
            display = "wizard",
            title = name,
            name,
            path,
            components,
            appSettings = new
            {
                showIconInFormsList = true,
                formsListIconKey = iconKey,
                publicDescription,
            },
        };

        return new SeedForm(name, JsonSerializer.SerializeToElement(schema, JsonOptions));
    }

    private static object Panel(string key, string title, string breadcrumb, object[] components) =>
        new { type = "panel", key, title, breadcrumb, components };

    private static object OperatorMachinePanel(
        string title,
        string breadcrumb,
        string? machinePrefix = null,
        int machineStart = 1,
        int machineEnd = 1,
        bool includeEmployeeId = false,
        string infoKey = "firstOperatorInfo",
        string machineLabel = "Machine ID",
        string[]? machineIds = null)
    {
        var components = new List<object>
        {
            TextField("fullName", "Full Name", input: true),
        };

        if (includeEmployeeId)
        {
            components.Add(TextField("employeeId", "Employee / Contractor ID", input: true));
        }

        machineIds ??= Enumerable.Range(machineStart, machineEnd - machineStart + 1)
            .Select(n => $"{machinePrefix}{n:00}")
            .ToArray();

        components.Add(Select("machineId", machineLabel, machineIds));
        components.Add(FirstOperatorRadio("firstOperatorShift"));
        components.Add(new
        {
            type = "textarea",
            key = infoKey,
            label = "Info",
            disabled = true,
            defaultValue = "You are responsible for identifying and reporting any new or unresolved issues.",
            conditional = Conditional("firstOperatorShift", "no"),
        });

        return Panel("step1_operator_machine", title, breadcrumb, components.ToArray());
    }

    private static object FaultDetailsPanel(string key, string title) =>
        Panel(key, title, "Fault Details",
        [
            YesNo("faultsFound", "Were any faults or damage identified?"),
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
                    new { label = "Minor – monitor", value = "minor" },
                    new { label = "Major – maintenance required", value = "major" },
                    new { label = "Critical – do not operate", value = "critical" },
                },
            },
        ]);

    private static object SafeToOperatePanel(string key, string title, string equipmentName, string unsafeReasonLabel, string unsafeMessage) =>
        Panel(key, title, "Safe to Operate",
        [
            YesNo("safeToOperate", $"Is this {equipmentName} safe to operate?"),
            TextArea("unsafeReason", unsafeReasonLabel, "safeToOperate", "no"),
            new
            {
                type = "textarea",
                key = "unsafeSystemMessage",
                label = "System message",
                disabled = true,
                defaultValue = unsafeMessage,
                conditional = Conditional("safeToOperate", "no"),
            },
        ]);

    private static object DeclarationPanel(string key, string title, string declaration, bool includeDateTime = false)
    {
        var components = new List<object>
        {
            new
            {
                type = "textarea",
                key = "declarationText",
                label = "Declaration",
                disabled = true,
                defaultValue = declaration,
            },
            TextField("operatorSignature", "Operator Signature (digital)"),
        };

        if (includeDateTime)
        {
            components.Add(new
            {
                type = "datetime",
                key = "operatorDateTime",
                label = "Date & Time (auto)",
                disabled = true,
                calculateValue = "value = new Date();",
            });
        }

        return Panel(key, title, "Declaration", components.ToArray());
    }

    private static object TextField(string key, string label, bool input = false) =>
        new { type = "textfield", key, label, validate = Required(), input };

    private static object TextArea(string key, string label, string when, string eq) =>
        new { type = "textarea", key, label, conditional = Conditional(when, eq), validate = Required() };

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

    private static object YesNo(string key, string label) =>
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
        };

    private static object Explain(string key, string when, string eq, string label = "Please explain why") =>
        TextArea(key, label, when, eq);

    private static object Required() => new { required = true };

    private static object Conditional(string when, string eq) => new { show = true, when, eq };
}
