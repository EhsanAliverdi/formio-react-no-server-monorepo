using System.Text.Json;
using HPA.SurveyFlow.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HPA.SurveyFlow.Infrastructure.Data.Seed;

/// <summary>
/// Seeds two integration rules and two notification rules per demo equipment pre-start form.
/// Condition JSON shape: groups have { operator, children } and leaves have { fieldKey, conditionOperator, value }.
/// Seeding is idempotent — skips forms that already have rules.
/// </summary>
internal static class DemoRulesSeedData
{
    private static readonly JsonSerializerOptions J = new(JsonSerializerDefaults.Web);

    // ── Condition JSON builders ──────────────────────────────────────────────

    // Group: { operator: "AND"|"OR", children: [...] }
    private static string AndGroup(params object[] children) =>
        JsonSerializer.Serialize(new { @operator = "AND", children }, J);

    private static string OrGroup(params object[] children) =>
        JsonSerializer.Serialize(new { @operator = "OR", children }, J);

    // Leaf: { fieldKey, conditionOperator, value }
    private static object Leaf(string fieldKey, string conditionOperator, string value = "") =>
        new { fieldKey, conditionOperator, value };

    // ── MEX field mapping JSON ────────────────────────────────────────────────

    private static string MexMappings(int priority, string equipmentName) =>
        JsonSerializer.Serialize(new
        {
            priorityNumber = new { source = "static", value = priority.ToString() },
            asset          = new { source = "field", fieldKey = "machineId" },
            requesterDetails = new
            {
                source   = "template",
                template = $"Operator: {{{{field:fullName}}}}\nID: {{{{field:employeeId}}}}\n{equipmentName}: {{{{asset_display}}}}\nOutcome: {{{{outcome}}}}\nSubmission #{{{{submission_id}}}}",
            },
            jobDescription = new
            {
                source   = "template",
                template = $"Pre-start defects — {equipmentName}\n\nAsset: {{{{asset_display}}}}\nOperator: {{{{field:fullName}}}} ({{{{field:employeeId}}}})\nOutcome: {{{{outcome}}}}\nSubmission: #{{{{submission_id}}}}\n\nWarning findings:\n{{{{warning_answers}}}}\n\nCritical findings:\n{{{{error_answers}}}}",
            },
        }, J);

    // ── Notification email helpers ────────────────────────────────────────────

    private static string EmailBody(string intro) =>
        $"<p>{intro}</p>" +
        "<p><strong>Asset:</strong> {{asset_display}}<br>" +
        "<strong>Operator:</strong> {{field:fullName}} ({{field:employeeId}})<br>" +
        "<strong>Outcome:</strong> {{outcome}} — {{error_count}} error(s), {{warning_count}} warning(s)</p>" +
        "<p>{{abnormal_answers_table}}</p>" +
        "<p><em>Submission #{{submission_id}} — submitted via SurveyFlow</em></p>";

    // ── Main entry point ─────────────────────────────────────────────────────

    public static async Task SeedAsync(AppDbContext db, bool overrideExisting = false)
    {
        foreach (var def in DemoEquipmentMexFlowSeedData.Definitions)
        {
            var form = await db.Forms
                .AsNoTracking()
                .FirstOrDefaultAsync(f => f.Name == def.ParentFormName);

            if (form is null) continue;

            var hasIntegration = await db.FormIntegrationRules.AnyAsync(r => r.FormId == form.Id);
            if (hasIntegration && overrideExisting)
            {
                var old = db.FormIntegrationRules.Where(r => r.FormId == form.Id);
                db.FormIntegrationRules.RemoveRange(old);
                hasIntegration = false;
            }
            if (!hasIntegration)
                SeedIntegrationRules(db, form.Id, def);

            var hasNotification = await db.FormNotificationRules.AnyAsync(r => r.FormId == form.Id);
            if (hasNotification && overrideExisting)
            {
                var old = db.FormNotificationRules.Where(r => r.FormId == form.Id);
                db.FormNotificationRules.RemoveRange(old);
                hasNotification = false;
            }
            if (!hasNotification)
                SeedNotificationRules(db, form.Id, def);
        }

        await db.SaveChangesAsync();
    }

    // ── Integration rules ─────────────────────────────────────────────────────
    // Rule 1 — tyre/wheel damage OR visible body damage (warning priority)
    // Rule 2 — declared unsafe to operate OR critical urgency (priority 1 / stop)

    private static void SeedIntegrationRules(AppDbContext db, int formId, EquipmentDemoDefinition def)
    {
        var eq    = def.EquipmentName;
        var title = ToTitle(eq);

        // Rule 1 — Damage reported (tyres/wheels OR visible body damage)
        // Fires on: tyresOrWheelsDamaged = yes  OR  visibleDamage = yes
        var rule1 = new FormIntegrationRule
        {
            FormId             = formId,
            Name               = $"{title} — Damage Reported",
            Enabled            = true,
            Channel            = "mex",
            SortOrder          = 0,
            ConditionGroupJson = OrGroup(
                Leaf("tyresOrWheelsDamaged", "equals", "yes"),
                Leaf("visibleDamage",        "equals", "yes")),
            CreatedAt  = DateTime.UtcNow,
            UpdatedAt  = DateTime.UtcNow,
        };
        rule1.MexConfig = new FormIntegrationRuleMex
        {
            Action            = "create_request",
            FieldMappingsJson = MexMappings(priority: 2, eq),
        };
        db.FormIntegrationRules.Add(rule1);

        // Rule 2 — Unsafe to operate OR critical fault
        // Fires on: safeToOperate = no  OR  urgencyLevel = critical
        var rule2 = new FormIntegrationRule
        {
            FormId             = formId,
            Name               = $"{title} — Unsafe / Do Not Operate",
            Enabled            = true,
            Channel            = "mex",
            SortOrder          = 1,
            ConditionGroupJson = OrGroup(
                Leaf("safeToOperate", "equals", "no"),
                Leaf("urgencyLevel",  "equals", "critical")),
            CreatedAt  = DateTime.UtcNow,
            UpdatedAt  = DateTime.UtcNow,
        };
        rule2.MexConfig = new FormIntegrationRuleMex
        {
            Action            = "create_request",
            FieldMappingsJson = MexMappings(priority: 1, eq),
        };
        db.FormIntegrationRules.Add(rule2);
    }

    // ── Notification rules ────────────────────────────────────────────────────
    // Rule 1 — Leak or safety device fault detected
    //   leaksVisible = yes  OR  safetyDevicesTampered = yes
    //   → maintenance email with warning level detail
    //
    // Rule 2 — Safety critical: brakes or steering failed OR unsafe declaration
    //   brakesOk = no  OR  steeringControlsOk = no  OR  safeToOperate = no
    //   → maintenance + supervisor email, PDF attached

    private static void SeedNotificationRules(AppDbContext db, int formId, EquipmentDemoDefinition def)
    {
        var eq    = def.EquipmentName;
        var title = ToTitle(eq);

        // Notification 1 — Leak or tampered safety device
        var notif1 = new FormNotificationRule
        {
            FormId             = formId,
            Name               = $"{title} — Leak or Safety Device Issue",
            Enabled            = true,
            Channel            = "email",
            SortOrder          = 0,
            ConditionGroupJson = OrGroup(
                Leaf("leaksVisible",          "equals", "yes"),
                Leaf("safetyDevicesTampered", "equals", "yes")),
            CreatedAt  = DateTime.UtcNow,
            UpdatedAt  = DateTime.UtcNow,
        };
        notif1.EmailConfig = new FormNotificationRuleEmail
        {
            ToAddressesJson = """["ehsan.aliverdi@gmail.com"]""",
            Subject         = $"⚠️ {title} — Leak or Safety Device Issue — {{{{asset_display}}}} #{{{{submission_id}}}}",
            BodyHtml        = EmailBody($"A potential leak or tampered safety device was identified on a <strong>{eq}</strong> pre-start checklist."),
            AttachPdf       = true,
        };
        db.FormNotificationRules.Add(notif1);

        // Notification 2 — Critical safety failure (brakes, steering, or unsafe declaration)
        var notif2 = new FormNotificationRule
        {
            FormId             = formId,
            Name               = $"{title} — Critical Safety Failure",
            Enabled            = true,
            Channel            = "email",
            SortOrder          = 1,
            ConditionGroupJson = OrGroup(
                Leaf("brakesOk",          "equals", "no"),
                Leaf("steeringControlsOk","equals", "no"),
                Leaf("safeToOperate",     "equals", "no")),
            CreatedAt  = DateTime.UtcNow,
            UpdatedAt  = DateTime.UtcNow,
        };
        notif2.EmailConfig = new FormNotificationRuleEmail
        {
            ToAddressesJson = """["ehsan.aliverdi@gmail.com"]""",
            Subject         = $"🚨 STOP — {title} Must Not Operate — {{{{asset_display}}}} #{{{{submission_id}}}}",
            BodyHtml        = EmailBody($"CRITICAL: A <strong>{eq}</strong> has been declared unsafe to operate or has a critical brake/steering failure. Immediate action required."),
            AttachPdf       = true,
        };
        db.FormNotificationRules.Add(notif2);
    }

    private static string ToTitle(string value) =>
        string.Join(" ", value.Split(' ', '/', StringSplitOptions.RemoveEmptyEntries)
            .Select(w => char.ToUpperInvariant(w[0]) + w[1..]));
}
