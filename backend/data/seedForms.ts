// Seed forms for SurveyFlow - Updated with V2 forms

export const forms = [
  // =========================================================
  // Forklift Pre-Start Checklist V2
  // =========================================================
  {
    name: "Forklift Pre-Start Checklist",
    schema: {
      type: "form",
      display: "wizard",
      title: "Forklift Pre-Start Checklist",
      name: "Forklift Pre-Start Checklist",
      path: "forklift-pre-start-checklist",
      components: [
        {
          type: "panel",
          key: "step1_operator_machine",
          title: "Step 1 – Operator & Machine Details",
          breadcrumb: "Operator & Machine Details",
          components: [
            { type: "textfield", key: "fullName", label: "Full Name", validate: { required: true }, input: true },
            { type: "textfield", key: "employeeId", label: "Employee / Contractor ID", validate: { required: true }, input: true },
            {
              type: "select",
              key: "machineId",
              label: "Machine ID",
              validate: { required: true },
              data: {
                values: [
                  { label: "FL01", value: "FL01" },
                  { label: "FL02", value: "FL02" },
                  { label: "FL03", value: "FL03" },
                  { label: "FL04", value: "FL04" },
                  { label: "FL05", value: "FL05" }
                ]
              },
              input: true
            },
            {
              type: "radio",
              key: "firstOperatorShift",
              label: "Are you the first operator of this shift?",
              validate: { required: true },
              values: [
                { label: "Yes", value: "yes" },
                { label: "No", value: "no" },
                { label: "No, but I would like to complete a Pre-Start Checklist", value: "no_complete" }
              ],
              input: true
            },
            {
              type: "textarea",
              key: "firstOperatorInfo_no",
              label: "Info",
              disabled: true,
              defaultValue: "You are responsible for identifying and reporting any new or unresolved issues.",
              conditional: { show: true, when: "firstOperatorShift", eq: "no" }
            }
          ]
        },
        {
          type: "panel",
          key: "step2_safety_systems",
          title: "Step 2 – Safety Systems",
          breadcrumb: "Safety Systems",
          components: [
            {
              type: "radio",
              key: "beaconsWorking",
              label: "Are all beacons working correctly?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "beaconsWorking_explain",
              label: "Please explain why",
              validate: { required: true },
              conditional: { show: true, when: "beaconsWorking", eq: "no" }
            },
            {
              type: "radio",
              key: "gaugesWorking",
              label: "Are all gauges and instruments functioning correctly?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "gaugesWorking_explain",
              label: "Please explain why",
              validate: { required: true },
              conditional: { show: true, when: "gaugesWorking", eq: "no" }
            },
            {
              type: "radio",
              key: "seatAndBeltOk",
              label: "Is the seat secure and the seat belt fully operational?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "seatAndBeltOk_explain",
              label: "Please explain why",
              validate: { required: true },
              conditional: { show: true, when: "seatAndBeltOk", eq: "no" }
            },
            {
              type: "radio",
              key: "fireExtinguisherOk",
              label: "Is a fire extinguisher present, accessible, and within inspection date?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "fireExtinguisherOk_explain",
              label: "Please explain why",
              validate: { required: true },
              conditional: { show: true, when: "fireExtinguisherOk", eq: "no" }
            },
            {
              type: "radio",
              key: "hornAudible",
              label: "Is the horn clearly audible?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "hornAudible_explain",
              label: "Please explain why",
              validate: { required: true },
              conditional: { show: true, when: "hornAudible", eq: "no" }
            },
            {
              type: "radio",
              key: "safetyDevicesTampered",
              label: "Is there any evidence of safety devices being tampered with?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "safetyDevicesTampered_explain",
              label: "Please explain why",
              validate: { required: true },
              conditional: { show: true, when: "safetyDevicesTampered", eq: "yes" }
            },
            {
              type: "radio",
              key: "loadChartLegible",
              label: "Is the load chart / data plate fitted and legible?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "loadChartLegible_explain",
              label: "Please explain why",
              validate: { required: true },
              conditional: { show: true, when: "loadChartLegible", eq: "no" }
            }
          ]
        },
        {
          type: "panel",
          key: "step3_wheels_tyres",
          title: "Step 3 – Wheels & Tyres",
          breadcrumb: "Wheels & Tyres",
          components: [
            {
              type: "radio",
              key: "tyresOrWheelsDamaged",
              label: "Is there any visible damage to tyres or wheels?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "tyresOrWheelsDamaged_explain",
              label: "If Yes → explain damage",
              validate: { required: true },
              conditional: { show: true, when: "tyresOrWheelsDamaged", eq: "yes" }
            },
            {
              type: "radio",
              key: "tyresInflatedGood",
              label: "Are all tyres correctly inflated and in good condition?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "tyresInflatedGood_explain",
              label: "Please explain why",
              validate: { required: true },
              conditional: { show: true, when: "tyresInflatedGood", eq: "no" }
            }
          ]
        },
        {
          type: "panel",
          key: "step4_frame_mast_attachments",
          title: "Step 4 – Frame, Mast & Attachments",
          breadcrumb: "Frame/Mast/Attachments",
          components: [
            {
              type: "radio",
              key: "frameDamaged",
              label: "Is there any visible damage to the forklift frame or body?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "frameDamaged_explain",
              label: "Please explain (damage / location)",
              validate: { required: true },
              conditional: { show: true, when: "frameDamaged", eq: "yes" }
            },
            {
              type: "radio",
              key: "mastSmoothNoCracksLeaks",
              label: "Is the mast operating smoothly with no visible cracks, bends, or leaks?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "mastSmoothNoCracksLeaks_explain",
              label: "Please explain why",
              validate: { required: true },
              conditional: { show: true, when: "mastSmoothNoCracksLeaks", eq: "no" }
            }
          ]
        },
        {
          type: "panel",
          key: "step5_brakes_controls",
          title: "Step 5 – Brakes & Controls",
          breadcrumb: "Brakes & Controls",
          components: [
            {
              type: "radio",
              key: "brakesOk",
              label: "Are brakes working correctly?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "brakesOk_explain",
              label: "Please explain why",
              validate: { required: true },
              conditional: { show: true, when: "brakesOk", eq: "no" }
            }
          ]
        },
        {
          type: "panel",
          key: "step6_lights_visibility_access",
          title: "Step 6 – Lights, Visibility & Access",
          breadcrumb: "Lights/Visibility/Access",
          components: [
            {
              type: "radio",
              key: "lightsWorking",
              label: "Are all lights working correctly?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "lightsWorking_explain",
              label: "Please explain why",
              validate: { required: true },
              conditional: { show: true, when: "lightsWorking", eq: "no" }
            }
          ]
        },
        {
          type: "panel",
          key: "step7_general_condition",
          title: "Step 7 – General Condition & Housekeeping",
          breadcrumb: "General Condition",
          components: [
            {
              type: "radio",
              key: "cabinClean",
              label: "Is the cabin clean and clear?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "cabinClean_explain",
              label: "Please explain why",
              validate: { required: true },
              conditional: { show: true, when: "cabinClean", eq: "no" }
            }
          ]
        },
        {
          type: "panel",
          key: "step8_fault_details",
          title: "Step 8 – Fault Details & Evidence",
          breadcrumb: "Fault Details",
          components: [
            {
              type: "radio",
              key: "faultsFound",
              label: "Were any faults or damage identified?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "faultDetails",
              label: "Details of faults / damage",
              conditional: { show: true, when: "faultsFound", eq: "yes" },
              validate: { required: true }
            },
            {
              type: "radio",
              key: "urgencyLevel",
              label: "Urgency level",
              conditional: { show: true, when: "faultsFound", eq: "yes" },
              validate: { required: true },
              values: [
                { label: "Minor – monitor", value: "minor" },
                { label: "Major – maintenance required", value: "major" },
                { label: "Critical – do not operate", value: "critical" }
              ]
            }
          ]
        },
        {
          type: "panel",
          key: "step9_safe_to_operate",
          title: "Step 9 – Safe to Operate Declaration",
          breadcrumb: "Safe to Operate",
          components: [
            {
              type: "radio",
              key: "safeToOperate",
              label: "Is this forklift safe to operate?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "unsafeReason",
              label: "Reason forklift is unsafe",
              conditional: { show: true, when: "safeToOperate", eq: "no" },
              validate: { required: true }
            },
            {
              type: "textarea",
              key: "unsafeSystemMessage",
              label: "System message",
              disabled: true,
              defaultValue: "Forklift must be isolated and reported to maintenance.",
              conditional: { show: true, when: "safeToOperate", eq: "no" }
            }
          ]
        },
        {
          type: "panel",
          key: "step10_operator_declaration",
          title: "Step 10 – Operator Declaration",
          breadcrumb: "Declaration",
          components: [
            {
              type: "textarea",
              key: "declarationText",
              label: "Declaration",
              disabled: true,
              defaultValue: "I confirm that I have completed this pre-start checklist accurately and will not operate this forklift if it is unsafe."
            },
            {
              type: "textfield",
              key: "operatorSignature",
              label: "Operator Signature (digital)",
              validate: { required: true }
            }
          ]
        }
      ],
      appSettings: {
        showIconInFormsList: true,
        formsListIconKey: "fa:FaAccessibleIcon",
        publicDescription: "A structured pre-start forklift inspection checklist guiding operators through safety, mechanical condition, faults, and declarations to ensure equipment is safe before operation."
      }
    }
  },

  // =========================================================
  // Reach Stacker Pre-Start Checklist V2
  // =========================================================
  {
    name: "Reach Stacker Pre-Start Checklist",
    schema: {
      type: "form",
      display: "wizard",
      title: "Reach Stacker Pre-Start Checklist",
      name: "Reach Stacker Pre-Start Checklist",
      path: "reach-stacker-prestart",
      components: [
        {
          type: "panel",
          key: "step1_operator_machine",
          title: "Step 1 – Operator & Machine Details",
          breadcrumb: "Operator & Machine",
          components: [
            { type: "textfield", key: "fullName", label: "Full Name", validate: { required: true }, input: true },
            {
              type: "select",
              key: "machineId",
              label: "Machine ID",
              validate: { required: true },
              data: {
                values: [
                  { label: "RS01", value: "RS01" },
                  { label: "RS02", value: "RS02" },
                  { label: "RS03", value: "RS03" },
                  { label: "RS04", value: "RS04" },
                  { label: "RS05", value: "RS05" },
                  { label: "RS06", value: "RS06" }
                ]
              },
              input: true
            },
            {
              type: "radio",
              key: "firstOperatorShift",
              label: "Are you the first operator of this shift?",
              validate: { required: true },
              values: [
                { label: "Yes", value: "yes" },
                { label: "No", value: "no" },
                { label: "No, but I would like to complete a Pre-Start Checklist", value: "no_complete" }
              ],
              input: true
            },
            {
              type: "textarea",
              key: "firstOperatorInfo",
              label: "Info",
              disabled: true,
              defaultValue: "You are responsible for identifying and reporting any new or unresolved issues.",
              conditional: { show: true, when: "firstOperatorShift", eq: "no" }
            }
          ]
        },
        {
          type: "panel",
          key: "step2_general_condition",
          title: "Step 2 – General Condition & Access",
          breadcrumb: "General Condition",
          components: [
            {
              type: "radio",
              key: "groundChecksCompleted",
              label: "Have ground level checks been completed?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "groundChecksCompleted_explain",
              label: "Please explain why",
              conditional: { show: true, when: "groundChecksCompleted", eq: "no" },
              validate: { required: true }
            },
            {
              type: "radio",
              key: "visibleDamage",
              label: "Is there any visible damage evident?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "visibleDamage_explain",
              label: "If Yes → describe damage",
              conditional: { show: true, when: "visibleDamage", eq: "yes" },
              validate: { required: true }
            },
            {
              type: "radio",
              key: "stairsServiceable",
              label: "Are stairs and handrails in good condition?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "stairsServiceable_explain",
              label: "Please explain why",
              conditional: { show: true, when: "stairsServiceable", eq: "no" },
              validate: { required: true }
            }
          ]
        },
        {
          type: "panel",
          key: "step3_operator_safety",
          title: "Step 3 – Operator Safety Systems",
          breadcrumb: "Safety Systems",
          components: [
            {
              type: "radio",
              key: "seatAndBeltOk",
              label: "Is the seat and seat belt in good condition?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "seatAndBeltOk_explain",
              label: "Please explain why",
              conditional: { show: true, when: "seatAndBeltOk", eq: "no" },
              validate: { required: true }
            },
            {
              type: "radio",
              key: "hornAudible",
              label: "Is the horn clearly audible?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "hornAudible_explain",
              label: "Please explain why",
              conditional: { show: true, when: "hornAudible", eq: "no" },
              validate: { required: true }
            }
          ]
        },
        {
          type: "panel",
          key: "step4_brakes_controls",
          title: "Step 4 – Brakes & Controls",
          breadcrumb: "Brakes & Controls",
          components: [
            {
              type: "radio",
              key: "brakesOk",
              label: "Are brakes working correctly?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "brakesOk_explain",
              label: "Please explain why",
              conditional: { show: true, when: "brakesOk", eq: "no" },
              validate: { required: true }
            }
          ]
        },
        {
          type: "panel",
          key: "step5_fault_details",
          title: "Step 5 – Fault Details & Evidence",
          breadcrumb: "Fault Details",
          components: [
            {
              type: "radio",
              key: "faultsFound",
              label: "Were any faults or damage identified?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "faultDetails",
              label: "Details of faults / damage",
              conditional: { show: true, when: "faultsFound", eq: "yes" },
              validate: { required: true }
            },
            {
              type: "radio",
              key: "urgencyLevel",
              label: "Urgency level",
              conditional: { show: true, when: "faultsFound", eq: "yes" },
              validate: { required: true },
              values: [
                { label: "Minor – monitor", value: "minor" },
                { label: "Major – maintenance required", value: "major" },
                { label: "Critical – do not operate", value: "critical" }
              ]
            }
          ]
        },
        {
          type: "panel",
          key: "step6_safe_to_operate",
          title: "Step 6 – Safe to Operate Declaration",
          breadcrumb: "Safe to Operate",
          components: [
            {
              type: "radio",
              key: "safeToOperate",
              label: "Is this reach stacker safe to operate?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "unsafeReason",
              label: "Reason reach stacker is unsafe",
              conditional: { show: true, when: "safeToOperate", eq: "no" },
              validate: { required: true }
            },
            {
              type: "textarea",
              key: "unsafeSystemMessage",
              label: "System message",
              disabled: true,
              defaultValue: "Reach stacker must be isolated and reported to maintenance.",
              conditional: { show: true, when: "safeToOperate", eq: "no" }
            }
          ]
        },
        {
          type: "panel",
          key: "step7_operator_declaration",
          title: "Step 7 – Operator Declaration",
          breadcrumb: "Declaration",
          components: [
            {
              type: "textarea",
              key: "declarationText",
              label: "Declaration",
              disabled: true,
              defaultValue: "I confirm that I have completed this pre-start checklist accurately and will not operate this reach stacker if it is unsafe."
            },
            {
              type: "textfield",
              key: "operatorSignature",
              label: "Operator Signature (digital)",
              validate: { required: true }
            }
          ]
        }
      ],
      appSettings: {
        showIconInFormsList: true,
        formsListIconKey: "fa:FaWarehouse",
        publicDescription: "A structured reach stacker pre-start checklist ensuring safe operation, system integrity, and fault reporting before equipment use."
      }
    }
  },

  // =========================================================
  // Shuttle & Straddle Pre-Start Checklist V2
  // =========================================================
  {
    name: "Shuttle & Straddle Pre-Start Checklist",
    schema: {
      type: "form",
      display: "wizard",
      title: "Shuttle & Straddle Pre-Start Checklist",
      name: "Shuttle & Straddle Pre-Start Checklist",
      path: "shuttle-straddle-prestart",
      components: [
        {
          type: "panel",
          key: "step1_operator_machine",
          title: "Step 1 – Operator & Machine Details",
          breadcrumb: "Operator & Machine",
          components: [
            { type: "textfield", key: "fullName", label: "Full Name", validate: { required: true }, input: true },
            {
              type: "select",
              key: "machineId",
              label: "Machine ID",
              validate: { required: true },
              data: {
                values: [
                  { label: "SC01", value: "SC01" },
                  { label: "SC02", value: "SC02" },
                  { label: "SC03", value: "SC03" },
                  { label: "SC04", value: "SC04" },
                  { label: "SC05", value: "SC05" },
                  { label: "SC06", value: "SC06" },
                  { label: "SC07", value: "SC07" },
                  { label: "SC08", value: "SC08" },
                  { label: "SC11", value: "SC11" },
                  { label: "SC12", value: "SC12" },
                  { label: "SC21", value: "SC21" },
                  { label: "SC22", value: "SC22" },
                  { label: "SC23", value: "SC23" }
                ]
              },
              input: true
            },
            {
              type: "radio",
              key: "firstOperatorShift",
              label: "Are you the first operator of this shift?",
              validate: { required: true },
              values: [
                { label: "Yes", value: "yes" },
                { label: "No", value: "no" },
                { label: "No, but I would like to complete a Pre-Start Checklist", value: "no_complete" }
              ],
              input: true
            },
            {
              type: "textarea",
              key: "firstOperatorInfo",
              label: "Info",
              disabled: true,
              defaultValue: "You are responsible for identifying and reporting any new or unresolved issues.",
              conditional: { show: true, when: "firstOperatorShift", eq: "no" }
            }
          ]
        },
        {
          type: "panel",
          key: "step2_ground_tyres",
          title: "Step 2 – Ground & Tyres",
          breadcrumb: "Ground & Tyres",
          components: [
            {
              type: "radio",
              key: "groundChecksCompleted",
              label: "Have ground level checks been completed?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "groundChecksCompleted_explain",
              label: "Please explain why",
              conditional: { show: true, when: "groundChecksCompleted", eq: "no" },
              validate: { required: true }
            },
            {
              type: "radio",
              key: "tyresOk",
              label: "Are tyres in good condition?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "tyresOk_explain",
              label: "Please explain why",
              conditional: { show: true, when: "tyresOk", eq: "no" },
              validate: { required: true }
            }
          ]
        },
        {
          type: "panel",
          key: "step3_safety_systems",
          title: "Step 3 – Safety Systems",
          breadcrumb: "Safety Systems",
          components: [
            {
              type: "radio",
              key: "oilLeaksVisible",
              label: "Are there any signs of oil leaks?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "oilLeaksVisible_explain",
              label: "If Yes → describe leak",
              conditional: { show: true, when: "oilLeaksVisible", eq: "yes" },
              validate: { required: true }
            },
            {
              type: "radio",
              key: "fireExtinguisherOk",
              label: "Is a fire extinguisher available and checked?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "fireExtinguisherOk_explain",
              label: "Please explain why",
              conditional: { show: true, when: "fireExtinguisherOk", eq: "no" },
              validate: { required: true }
            },
            {
              type: "radio",
              key: "safetyDevicesTampered",
              label: "Any evidence of safety devices being tampered with or missing?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "safetyDevicesTampered_explain",
              label: "If Yes → describe issue",
              conditional: { show: true, when: "safetyDevicesTampered", eq: "yes" },
              validate: { required: true }
            }
          ]
        },
        {
          type: "panel",
          key: "step4_fault_details",
          title: "Step 4 – Fault Details & Evidence",
          breadcrumb: "Fault Details",
          components: [
            {
              type: "radio",
              key: "faultsFound",
              label: "Were any faults or damage identified?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "faultDetails",
              label: "Details of faults / damage",
              conditional: { show: true, when: "faultsFound", eq: "yes" },
              validate: { required: true }
            },
            {
              type: "radio",
              key: "urgencyLevel",
              label: "Urgency level",
              conditional: { show: true, when: "faultsFound", eq: "yes" },
              validate: { required: true },
              values: [
                { label: "Minor – monitor", value: "minor" },
                { label: "Major – maintenance required", value: "major" },
                { label: "Critical – do not operate", value: "critical" }
              ]
            }
          ]
        },
        {
          type: "panel",
          key: "step5_safe_to_operate",
          title: "Step 5 – Safe to Operate Declaration",
          breadcrumb: "Safe to Operate",
          components: [
            {
              type: "radio",
              key: "safeToOperate",
              label: "Is this shuttle/straddle carrier safe to operate?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "unsafeReason",
              label: "Reason equipment is unsafe",
              conditional: { show: true, when: "safeToOperate", eq: "no" },
              validate: { required: true }
            },
            {
              type: "textarea",
              key: "unsafeSystemMessage",
              label: "System message",
              disabled: true,
              defaultValue: "Equipment must be isolated and reported to maintenance.",
              conditional: { show: true, when: "safeToOperate", eq: "no" }
            }
          ]
        },
        {
          type: "panel",
          key: "step6_operator_declaration",
          title: "Step 6 – Operator Declaration",
          breadcrumb: "Declaration",
          components: [
            {
              type: "textarea",
              key: "declarationText",
              label: "Declaration",
              disabled: true,
              defaultValue: "I confirm that I have completed this pre-start checklist accurately and will not operate this shuttle or straddle carrier if it is unsafe."
            },
            {
              type: "textfield",
              key: "operatorSignature",
              label: "Operator Signature (digital)",
              validate: { required: true }
            }
          ]
        }
      ],
      appSettings: {
        showIconInFormsList: true,
        formsListIconKey: "fa:FaTruckMoving",
        publicDescription: "A structured shuttle and straddle pre-start checklist ensuring safety compliance, fault reporting, and safe operation before equipment use."
      }
    }
  },

  // =========================================================
  // Light Vehicle Pre-Start Checklist V2
  // =========================================================
  {
    name: "Light Vehicle Pre-Start Checklist",
    schema: {
      type: "form",
      display: "wizard",
      title: "Light Vehicle Pre-Start Checklist",
      name: "Light Vehicle Pre-Start Checklist",
      path: "light-vehicle-prestart",
      components: [
        {
          type: "panel",
          key: "step1_operator_vehicle",
          title: "Step 1 – Operator & Vehicle Details",
          breadcrumb: "Operator & Vehicle",
          components: [
            { type: "textfield", key: "fullName", label: "Full Name", validate: { required: true }, input: true },
            { type: "email", key: "email", label: "Email", validate: { required: true }, input: true },
            { type: "datetime", key: "date", label: "Date", disabled: true, calculateValue: "value = new Date();", input: true },
            {
              type: "select",
              key: "vehicleId",
              label: "Vehicle ID",
              validate: { required: true },
              data: {
                values: [
                  { label: "CAR30", value: "CAR30" },
                  { label: "CAR31", value: "CAR31" },
                  { label: "CAR32", value: "CAR32" },
                  { label: "CAR33", value: "CAR33" },
                  { label: "CAR40", value: "CAR40" },
                  { label: "CAR50", value: "CAR50" },
                  { label: "CAR55", value: "CAR55" },
                  { label: "CAR60", value: "CAR60" },
                  { label: "CAR61", value: "CAR61" },
                  { label: "CAR62", value: "CAR62" },
                  { label: "CAR63", value: "CAR63" },
                  { label: "CAR64", value: "CAR64" },
                  { label: "CAR65", value: "CAR65" },
                  { label: "CAR66", value: "CAR66" },
                  { label: "CAR67", value: "CAR67" },
                  { label: "CAR68", value: "CAR68" },
                  { label: "CAR69", value: "CAR69" },
                  { label: "TT01", value: "TT01" },
                  { label: "TT12", value: "TT12" },
                  { label: "TT13", value: "TT13" },
                  { label: "TT16", value: "TT16" }
                ]
              },
              input: true
            },
            {
              type: "radio",
              key: "firstOperator",
              label: "Are you the first operator of this shift?",
              validate: { required: true },
              values: [
                { label: "Yes", value: "yes" },
                { label: "No", value: "no" },
                { label: "No, but I would like to complete a Pre-Start Checklist", value: "no_complete" }
              ],
              input: true
            }
          ]
        },
        {
          type: "panel",
          key: "step2_safety_checks",
          title: "Step 2 – Safety Checks",
          breadcrumb: "Safety Checks",
          components: [
            {
              type: "radio",
              key: "beaconsWorking",
              label: "Are all beacons working correctly?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "beaconsWorking_explain",
              label: "Please explain why",
              conditional: { show: true, when: "beaconsWorking", eq: "no" },
              validate: { required: true }
            },
            {
              type: "radio",
              key: "fireExtinguisherOk",
              label: "Is a fire extinguisher available and within inspection date?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "fireExtinguisherOk_explain",
              label: "Please explain why",
              conditional: { show: true, when: "fireExtinguisherOk", eq: "no" },
              validate: { required: true }
            },
            {
              type: "radio",
              key: "hornAudible",
              label: "Is the horn clearly audible?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "hornAudible_explain",
              label: "Please explain why",
              conditional: { show: true, when: "hornAudible", eq: "no" },
              validate: { required: true }
            }
          ]
        },
        {
          type: "panel",
          key: "step3_vehicle_condition",
          title: "Step 3 – Vehicle Condition",
          breadcrumb: "Vehicle Condition",
          components: [
            {
              type: "radio",
              key: "tyresOk",
              label: "Are tyres in good condition?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "tyresOk_explain",
              label: "Please explain why",
              conditional: { show: true, when: "tyresOk", eq: "no" },
              validate: { required: true }
            },
            {
              type: "radio",
              key: "leaksVisible",
              label: "Are there any visible leaks?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "leaksVisible_explain",
              label: "If Yes → describe leak",
              conditional: { show: true, when: "leaksVisible", eq: "yes" },
              validate: { required: true }
            },
            {
              type: "radio",
              key: "brakesOk",
              label: "Are the brakes working correctly?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "brakesOk_explain",
              label: "Please explain why",
              conditional: { show: true, when: "brakesOk", eq: "no" },
              validate: { required: true }
            }
          ]
        },
        {
          type: "panel",
          key: "step4_safe_to_operate",
          title: "Step 4 – Safe to Operate Declaration",
          breadcrumb: "Safe to Operate",
          components: [
            {
              type: "radio",
              key: "safeToOperate",
              label: "Is this vehicle safe to operate?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "unsafeReason",
              label: "Reason vehicle is unsafe",
              conditional: { show: true, when: "safeToOperate", eq: "no" },
              validate: { required: true }
            },
            {
              type: "textarea",
              key: "unsafeSystemMessage",
              label: "System message",
              disabled: true,
              defaultValue: "Vehicle must be isolated and reported to maintenance.",
              conditional: { show: true, when: "safeToOperate", eq: "no" }
            }
          ]
        },
        {
          type: "panel",
          key: "step5_operator_declaration",
          title: "Step 5 – Operator Declaration",
          breadcrumb: "Declaration",
          components: [
            {
              type: "textarea",
              key: "declarationText",
              label: "Declaration",
              disabled: true,
              defaultValue: "I confirm that I have completed this pre-start checklist accurately and will not operate this vehicle if it is unsafe."
            },
            {
              type: "textfield",
              key: "operatorSignature",
              label: "Operator Signature (digital)",
              validate: { required: true }
            },
            {
              type: "datetime",
              key: "operatorDateTime",
              label: "Date & Time (auto)",
              disabled: true,
              calculateValue: "value = new Date();"
            }
          ]
        }
      ],
      appSettings: {
        showIconInFormsList: true,
        formsListIconKey: "fa:FaCarSide",
        publicDescription: "A structured light vehicle pre-start checklist ensuring safety, compliance, and fault reporting before vehicle operation."
      }
    }
  },

  // =========================================================
  // Quay Crane Pre-Start Checklist V2
  // =========================================================
  {
    name: "Quay Crane Pre-Start Checklist",
    schema: {
      type: "form",
      display: "wizard",
      title: "Quay Crane Pre-Start Checklist",
      name: "Quay Crane Pre-Start Checklist",
      path: "quay-crane-prestart",
      components: [
        {
          type: "panel",
          key: "step1_operator_machine",
          title: "Step 1 – Operator & Crane Details",
          breadcrumb: "Operator & Crane",
          components: [
            { type: "textfield", key: "fullName", label: "Full Name", validate: { required: true }, input: true },
            {
              type: "select",
              key: "machineId",
              label: "Crane ID",
              validate: { required: true },
              data: {
                values: [
                  { label: "QC01", value: "QC01" },
                  { label: "QC02", value: "QC02" },
                  { label: "QC03", value: "QC03" },
                  { label: "QC04", value: "QC04" }
                ]
              },
              input: true
            },
            {
              type: "radio",
              key: "firstOperatorShift",
              label: "Are you the first operator of this shift?",
              validate: { required: true },
              values: [
                { label: "Yes", value: "yes" },
                { label: "No", value: "no" },
                { label: "No, but I would like to complete a Pre-Start Checklist", value: "no_complete" }
              ],
              input: true
            },
            {
              type: "textarea",
              key: "firstOperatorInfo",
              label: "Info",
              disabled: true,
              defaultValue: "You are responsible for identifying and reporting any new or unresolved issues.",
              conditional: { show: true, when: "firstOperatorShift", eq: "no" }
            }
          ]
        },
        {
          type: "panel",
          key: "step2_working_area_access",
          title: "Step 2 – Working Area & Access",
          breadcrumb: "Working Area",
          components: [
            {
              type: "radio",
              key: "tracksClear",
              label: "Tracks clear of obstructions and cable reel tracking correctly?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "tracksClear_explain",
              label: "Please explain why",
              conditional: { show: true, when: "tracksClear", eq: "no" },
              validate: { required: true }
            },
            {
              type: "radio",
              key: "workingAreaClear",
              label: "Working area clear of obstructions and storm pins correctly positioned?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "workingAreaClear_explain",
              label: "Please explain why",
              conditional: { show: true, when: "workingAreaClear", eq: "no" },
              validate: { required: true }
            }
          ]
        },
        {
          type: "panel",
          key: "step3_safety_systems",
          title: "Step 3 – Safety & Access Systems",
          breadcrumb: "Safety Systems",
          components: [
            {
              type: "radio",
              key: "sirensAudible",
              label: "Long travel sirens / squawkers audible?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "sirensAudible_explain",
              label: "Please explain why",
              conditional: { show: true, when: "sirensAudible", eq: "no" },
              validate: { required: true }
            },
            {
              type: "radio",
              key: "stairsServiceable",
              label: "Stairs and handrails in a serviceable condition?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "stairsServiceable_explain",
              label: "Please explain why",
              conditional: { show: true, when: "stairsServiceable", eq: "no" },
              validate: { required: true }
            },
            {
              type: "radio",
              key: "accessGatesOk",
              label: "Access gates operating and locking correctly?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "accessGatesOk_explain",
              label: "Please explain why",
              conditional: { show: true, when: "accessGatesOk", eq: "no" },
              validate: { required: true }
            },
            {
              type: "radio",
              key: "elevatorOk",
              label: "Access elevator / hoist operating correctly?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "elevatorOk_explain",
              label: "Please explain why",
              conditional: { show: true, when: "elevatorOk", eq: "no" },
              validate: { required: true }
            }
          ]
        },
        {
          type: "panel",
          key: "step4_spreader_condition",
          title: "Step 4 – Spreader Condition & Function",
          breadcrumb: "Spreader",
          components: [
            {
              type: "radio",
              key: "spreaderDamage",
              label: "Is there any visible damage to the spreader?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "spreaderDamage_explain",
              label: "If Yes → describe damage",
              conditional: { show: true, when: "spreaderDamage", eq: "yes" },
              validate: { required: true }
            },
            {
              type: "radio",
              key: "spreaderFunctionOk",
              label: "Is the spreader functioning correctly?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "spreaderFunctionOk_explain",
              label: "Please explain why",
              conditional: { show: true, when: "spreaderFunctionOk", eq: "no" },
              validate: { required: true }
            }
          ]
        },
        {
          type: "panel",
          key: "step5_fault_details",
          title: "Step 5 – Fault Details & Evidence",
          breadcrumb: "Fault Details",
          components: [
            {
              type: "radio",
              key: "faultsFound",
              label: "Were any faults or damage identified?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "faultDetails",
              label: "Details of faults / damage",
              conditional: { show: true, when: "faultsFound", eq: "yes" },
              validate: { required: true }
            },
            {
              type: "radio",
              key: "urgencyLevel",
              label: "Urgency level",
              conditional: { show: true, when: "faultsFound", eq: "yes" },
              validate: { required: true },
              values: [
                { label: "Minor – monitor", value: "minor" },
                { label: "Major – maintenance required", value: "major" },
                { label: "Critical – do not operate", value: "critical" }
              ]
            }
          ]
        },
        {
          type: "panel",
          key: "step6_safe_to_operate",
          title: "Step 6 – Safe to Operate Declaration",
          breadcrumb: "Safe to Operate",
          components: [
            {
              type: "radio",
              key: "safeToOperate",
              label: "Is this quay crane safe to operate?",
              validate: { required: true },
              values: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
            },
            {
              type: "textarea",
              key: "unsafeReason",
              label: "Reason crane is unsafe",
              conditional: { show: true, when: "safeToOperate", eq: "no" },
              validate: { required: true }
            },
            {
              type: "textarea",
              key: "unsafeSystemMessage",
              label: "System message",
              disabled: true,
              defaultValue: "Crane must be isolated and reported to maintenance.",
              conditional: { show: true, when: "safeToOperate", eq: "no" }
            }
          ]
        },
        {
          type: "panel",
          key: "step7_operator_declaration",
          title: "Step 7 – Operator Declaration",
          breadcrumb: "Declaration",
          components: [
            {
              type: "textarea",
              key: "declarationText",
              label: "Declaration",
              disabled: true,
              defaultValue: "I confirm that I have completed this pre-start checklist accurately and will not operate this quay crane if it is unsafe."
            },
            {
              type: "textfield",
              key: "operatorSignature",
              label: "Operator Signature (digital)",
              validate: { required: true }
            }
          ]
        }
      ],
      appSettings: {
        showIconInFormsList: true,
        formsListIconKey: "fa:FaIndustry",
        publicDescription: "A structured quay crane pre-start checklist ensuring safe operation, system integrity, and fault reporting before crane use."
      }
    }
  }
];

