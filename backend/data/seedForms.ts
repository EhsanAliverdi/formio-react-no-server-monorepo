// Plain JSON array for seeding, no FormIO dependency
// ===============================
// Shared Yes / No options
// MUST be declared BEFORE forms
// ===============================
const yesNo = [
  { label: "Yes", value: "Yes" },
  { label: "No", value: "No" }
];

export const forms = [
  // =========================================================
  // Forklift Pre-Start Checklist (EXISTING – UNCHANGED)
  // =========================================================
  {
    _id: "forkliftPrestart",
    title: "Fork Lift Pre-Start Checklist",
    name: "forklift-prestart",
    path: "forklift-prestart",
    type: "form",
    display: "form",
    components: [
      { type: "textfield", key: "fullName", label: "Full Name", input: true },
      {
        type: "select",
        key: "machineId",
        label: "Machine ID",
        input: true,
        data: { values: ["FL01","FL02","FL03","FL04","FL05"].map(v => ({ label: v, value: v })) },
        dataSrc: "values"
      },
      {
        type: "select",
        key: "firstOperator",
        label: "Are you the first operator?",
        input: true,
        data: {
          values: [
            { label: "Yes", value: "Yes" },
            { label: "No", value: "No" },
            { label: "No, but I would like to complete a Pre-Start Checklist", value: "No, but I would like to complete a Pre-Start Checklist" }
          ]
        },
        dataSrc: "values"
      }
      // (forklift questions already completed in your version)
    ]
  },

  // =========================================================
  // Light Vehicle Pre-Start Checklist
  // =========================================================
  {
    _id: "lightVehiclePrestart",
    title: "Light Vehicle Pre-Start Checklist",
    name: "light-vehicle-prestart",
    path: "light-vehicle-prestart",
    type: "form",
    display: "wizard",
    components: [
      {
        type: "panel",
        title: "Operator & Vehicle",
        key: "page_operator_vehicle",
        components: [
          { type: "textfield", key: "fullName", label: "Full Name", input: true },
          { type: "email", key: "email", label: "Email", input: true },
          { type: "datetime", key: "date", label: "Date", input: true },
          {
            type: "select",
            key: "machineId",
            label: "Machine ID",
            input: true,
            data: {
              values: [
                "CAR30","CAR31","CAR32","CAR33","CAR40","CAR50","CAR55","CAR60",
                "CAR61","CAR62","CAR63","CAR64","CAR65","CAR66","CAR67","CAR68",
                "CAR69","TT01","TT12","TT13","TT16"
              ].map(v => ({ label: v, value: v }))
            },
            dataSrc: "values"
          },
          {
            type: "select",
            key: "firstOperator",
            label: "Are you the first operator?",
            input: true,
            data: {
              values: [
                { label: "Yes", value: "Yes" },
                { label: "No", value: "No" },
                { label: "No, but I would like to complete a Pre-Start Checklist", value: "No, but I would like to complete a Pre-Start Checklist" }
              ]
            },
            dataSrc: "values"
          }
        ]
      },
      {
        type: "panel",
        title: "Safety Checks",
        key: "page_safety_checks",
        components: [
          { type: "radio", key: "beacons", label: "Are all beacons working correctly?", input: true, values: yesNo },
          { type: "radio", key: "gauges", label: "Are all gauges and instruments working correctly?", input: true, values: yesNo },
          { type: "radio", key: "seat", label: "Is the seat and seat belt in good condition?", input: true, values: yesNo },
          { type: "radio", key: "fireExtinguisher", label: "Is there a Fire Extinguisher available and valid?", input: true, values: yesNo },
          { type: "radio", key: "horn", label: "Is the horn clearly audible?", input: true, values: yesNo },
          { type: "radio", key: "tampered", label: "Any evidence of safety devices being tampered with?", input: true, values: yesNo }
        ]
      },
      {
        type: "panel",
        title: "Condition & Notes",
        key: "page_condition_notes",
        components: [
          { type: "radio", key: "tyres", label: "Are the tyres in good condition?", input: true, values: yesNo },
          { type: "radio", key: "rims", label: "Is there any visible damage to the rims?", input: true, values: yesNo },
          { type: "radio", key: "leaks", label: "Are there any visible leaks?", input: true, values: yesNo },
          { type: "radio", key: "bodyDamage", label: "Is there any visible damage to the vehicle body?", input: true, values: yesNo },
          { type: "radio", key: "brakes", label: "Are the brakes working correctly?", input: true, values: yesNo },
          { type: "radio", key: "lights", label: "Are all lights and indicators working correctly?", input: true, values: yesNo },
          { type: "radio", key: "cabinClear", label: "Was the vehicle cabin left in a clear manner?", input: true, values: yesNo },
          { type: "radio", key: "displays", label: "Are all gauges/displays clear and visible?", input: true, values: yesNo },
          { type: "radio", key: "mirrors", label: "Are all mirrors in place and correctly adjusted?", input: true, values: yesNo },
          { type: "radio", key: "windows", label: "Are windows clean prior to commencing work?", input: true, values: yesNo },
          { type: "radio", key: "damageVisible", label: "Is there any damage visible?", input: true, values: yesNo },
          { type: "textarea", key: "faultDetails", label: "Details of faults / damage", input: true },
          { type: "checkbox", key: "confirm", label: "I confirm the above is correct", input: true }
        ]
      }
    ]
  },

  // =========================================================
  // Quay Crane Pre-Start Checklist
  // =========================================================
  {
    _id: "quayCranePrestart",
    title: "Quay Crane Pre-Start Checklist",
    name: "quay-crane-prestart",
    path: "quay-crane-prestart",
    type: "form",
    display: "form",
    components: [
      { type: "textfield", key: "fullName", label: "Full Name", input: true },
      {
        type: "select",
        key: "machineId",
        label: "Machine ID",
        input: true,
        data: { values: ["QC01","QC02","QC03","QC04"].map(v => ({ label: v, value: v })) },
        dataSrc: "values"
      },
      {
        type: "select",
        key: "firstOperator",
        label: "Are you the first operator?",
        input: true,
        data: {
          values: [
            { label: "Yes", value: "Yes" },
            { label: "No", value: "No" },
            { label: "No, but I would like to complete a Pre-Start Checklist", value: "No, but I would like to complete a Pre-Start Checklist" }
          ]
        },
        dataSrc: "values"
      },

      { type: "radio", key: "tracks", label: "Tracks clear of obstructions and cable reel tracking correctly?", input: true, values: yesNo },
      { type: "radio", key: "workingArea", label: "Working area clear of obstructions, storm pins correct?", input: true, values: yesNo },
      { type: "radio", key: "sirens", label: "Long travel sirens/squawkers audible?", input: true, values: yesNo },

      { type: "radio", key: "stairs", label: "Stair and handrail condition serviceable?", input: true, values: yesNo },
      { type: "radio", key: "gates", label: "Access gates working/locking correctly?", input: true, values: yesNo },
      { type: "radio", key: "elevator", label: "Access elevator / hoist working correctly?", input: true, values: yesNo },

      { type: "radio", key: "spreaderDamage", label: "Check spreader for any visible damage?", input: true, values: yesNo },
      { type: "radio", key: "spreaderFunction", label: "Spreader functioning correctly?", input: true, values: yesNo },

      { type: "textarea", key: "faultDetails", label: "Details of faults / damage", input: true },
      { type: "button", action: "submit", label: "Submit", theme: "primary" }
    ]
  },

  // =========================================================
  // Reach Stacker Pre-Start Checklist
  // =========================================================
  {
    _id: "reachStackerPrestart",
    title: "Reach Stacker Pre-Start Checklist",
    name: "reach-stacker-prestart",
    path: "reach-stacker-prestart",
    type: "form",
    display: "form",
    components: [
      { type: "textfield", key: "fullName", label: "Full Name", input: true },
      {
        type: "select",
        key: "machineId",
        label: "Machine ID",
        input: true,
        data: { values: ["RS01","RS02","RS03","RS04","RS05","RS06"].map(v => ({ label: v, value: v })) },
        dataSrc: "values"
      },

      { type: "radio", key: "groundChecks", label: "Ground level checks completed?", input: true, values: yesNo },
      { type: "radio", key: "damage", label: "Is there any visible damage evident?", input: true, values: yesNo },
      { type: "radio", key: "stairs", label: "Are the stairs and handrails in good condition?", input: true, values: yesNo },

      { type: "radio", key: "seat", label: "Seat and seat belt in good condition?", input: true, values: yesNo },
      { type: "radio", key: "horn", label: "Is the horn clearly audible?", input: true, values: yesNo },
      { type: "radio", key: "brakes", label: "Are brakes working correctly?", input: true, values: yesNo },

      { type: "textarea", key: "faultDetails", label: "Details of faults / damage", input: true },
      { type: "button", action: "submit", label: "Submit", theme: "primary" }
    ]
  },

  // =========================================================
  // Shuttle & Straddle Pre-Start Checklist
  // =========================================================
  {
    _id: "shuttleStraddlePrestart",
    title: "Shuttle and Straddle Pre-Start Checklist",
    name: "shuttle-straddle-prestart",
    path: "shuttle-straddle-prestart",
    type: "form",
    display: "form",
    components: [
      { type: "textfield", key: "fullName", label: "Full Name", input: true },
      {
        type: "select",
        key: "machineId",
        label: "Machine ID",
        input: true,
        data: {
          values: [
            "SC01","SC02","SC03","SC04","SC05","SC06",
            "SC07","SC08","SC11","SC12","SC21","SC22","SC23"
          ].map(v => ({ label: v, value: v }))
        },
        dataSrc: "values"
      },

      { type: "radio", key: "groundChecks", label: "Ground level checks completed?", input: true, values: yesNo },
      { type: "radio", key: "tyres", label: "Are the tyres in good condition?", input: true, values: yesNo },
      { type: "radio", key: "oilLeaks", label: "Any signs of oil leaks?", input: true, values: yesNo },

      { type: "radio", key: "fireExtinguisher", label: "Fire extinguisher available and checked?", input: true, values: yesNo },
      { type: "radio", key: "tampered", label: "Any evidence of safety devices tampered with or missing?", input: true, values: yesNo },

      { type: "textarea", key: "faultDetails", label: "Details of faults / damage", input: true },
      { type: "button", action: "submit", label: "Submit", theme: "primary" }
    ]
  }
];

