using System.Text.Json;
using HPA.SurveyFlow.Domain.Entities;
using HPA.SurveyFlow.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HPA.SurveyFlow.Infrastructure.Data.Seed;

/// <summary>
/// Seeds 20 realistic forklift pre-start submissions spread across the last 10 days,
/// across 4 demo forklifts. Includes a mix of clean, warning, and critical outcomes
/// so dashboard charts and reports show meaningful data.
/// Also seeds 4 demo ExternalAsset records (forklift machines) if none exist.
/// </summary>
public static class DemoSubmissionsSeedData
{
    private static readonly JsonSerializerOptions J = new(JsonSerializerDefaults.Web);

    // Real MEX assets — externalId stored in submission machineId field, resolved to display name via JOIN
    private static readonly (string ExternalId, string DisplayName)[] Forklifts =
    [
        ("FL01", "FL01"),
        ("FL02", "FL02"),
        ("FL03", "FL03"),
        ("FL04", "FL04"),
        ("11058", "Forklift FL05 Electric"),
        ("11059", "Forklift FL06 Electric"),
    ];

    private static readonly (string Name, string EmployeeId)[] Operators =
    [
        ("James Mitchell",  "EMP-101"),
        ("Sarah O'Brien",   "EMP-142"),
        ("Carlos Rivera",   "EMP-088"),
        ("Priya Sharma",    "EMP-215"),
        ("Tom Walsh",       "EMP-067"),
    ];

    public static async Task SeedAsync(AppDbContext db, bool overrideExisting = false)
    {
        var forkliftForm = await db.Forms
            .AsNoTracking()
            .FirstOrDefaultAsync(f => f.Name == "Forklift Pre-Start to MEX Flow (Demo)");
        if (forkliftForm == null) return;

        // Skip if submissions already exist and not overriding
        var existingCount = await db.FormSubmissions
            .CountAsync(s => s.FormId == forkliftForm.Id);
        if (existingCount > 0 && !overrideExisting) return;

        if (existingCount > 0 && overrideExisting)
        {
            var existing = await db.FormSubmissions
                .Where(s => s.FormId == forkliftForm.Id)
                .ToListAsync();
            db.FormSubmissions.RemoveRange(existing);
            await db.SaveChangesAsync();
        }

        var now = DateTime.UtcNow;
        var rng = new Random(42); // fixed seed for reproducible data

        // 20 submissions spread over last 10 days across all 6 real MEX forklifts
        // Scenario mix: 12 clean, 5 warnings, 3 critical
        var scenarios = new[]
        {
            // (machineIdx, operatorIdx, daysAgo, hoursOffset, outcome)
            (0, 0, 0,  7,  "clean"),
            (1, 1, 0,  8,  "clean"),
            (2, 2, 1,  6,  "warning"),   // leaks
            (3, 3, 1,  7,  "clean"),
            (4, 4, 2,  6,  "clean"),
            (5, 0, 2,  7,  "critical"),  // brakes + unsafe
            (0, 1, 3,  6,  "clean"),
            (1, 2, 3,  8,  "warning"),   // visible damage
            (2, 3, 4,  6,  "clean"),
            (3, 4, 4,  7,  "clean"),
            (4, 0, 5,  6,  "critical"),  // leaks + safety tampered + unsafe
            (5, 1, 5,  8,  "clean"),
            (0, 2, 6,  6,  "clean"),
            (1, 3, 6,  7,  "warning"),   // tyres + leaks
            (2, 4, 7,  6,  "clean"),
            (3, 0, 7,  8,  "clean"),
            (4, 1, 8,  6,  "critical"),  // steering + unsafe
            (5, 2, 8,  7,  "clean"),
            (0, 3, 9,  6,  "clean"),
            (1, 4, 9,  7,  "warning"),   // visible damage
        };

        foreach (var (machineIdx, operatorIdx, daysAgo, hoursOffset, outcome) in scenarios)
        {
            var submittedAt = now
                .AddDays(-daysAgo)
                .Date
                .AddHours(hoursOffset)
                .AddMinutes(rng.Next(0, 45));

            var (externalId, _) = Forklifts[machineIdx];
            var (opName, empId) = Operators[operatorIdx];

            var data = BuildSubmissionData(externalId, opName, empId, outcome, rng);

            var submission = new FormSubmission
            {
                FormId      = forkliftForm.Id,
                SubmittedAt = submittedAt,
                Data        = JsonSerializer.Serialize(data, J),
            };

            db.FormSubmissions.Add(submission);
            await db.SaveChangesAsync(); // save each to get the Id for rule logs

            // Seed rule logs matching what would have fired
            await SeedRuleLogsAsync(db, submission, forkliftForm.Id, outcome, externalId, opName, empId, submittedAt);
        }

        Console.WriteLine("[Seed] Submissions: 20 forklift submissions seeded");
    }

    private static Dictionary<string, object?> BuildSubmissionData(
        string machineId, string opName, string empId, string outcome, Random rng)
    {
        var isClean    = outcome == "clean";
        var isWarning  = outcome == "warning";
        var isCritical = outcome == "critical";

        // Fault flags per outcome
        bool leaks            = isWarning  && rng.Next(2) == 0 || isCritical && rng.Next(2) == 0;
        bool visibleDamage    = isWarning  && rng.Next(2) == 0;
        bool tyresDamaged     = isWarning  && !visibleDamage && rng.Next(2) == 0;
        bool safetyTampered   = isCritical && rng.Next(2) == 0;
        bool brakesOk         = !isCritical || rng.Next(2) == 0;
        bool steeringOk       = !isCritical || brakesOk;
        bool safeToOperate    = isClean || isWarning;
        bool faultsFound      = isWarning || isCritical;

        // Ensure at least one fault on warning/critical
        if (isWarning  && !leaks && !visibleDamage && !tyresDamaged) leaks = true;
        if (isCritical && brakesOk && steeringOk)  brakesOk = false;

        string urgencyLevel = isClean ? "" : isCritical ? "critical" : "major";

        var data = new Dictionary<string, object?>
        {
            ["fullName"]              = opName,
            ["employeeId"]            = empId,
            ["machineId"]             = machineId,
            ["firstOperatorShift"]    = rng.Next(2) == 0 ? "yes" : "no",
            ["beaconsWorking"]        = "yes",
            ["gaugesWorking"]         = "yes",
            ["seatAndBeltOk"]         = "yes",
            ["hornAudible"]           = "yes",
            ["safetyDevicesTampered"] = safetyTampered ? "yes" : "no",
            ["visibleDamage"]         = visibleDamage ? "yes" : "no",
            ["tyresOrWheelsDamaged"]  = tyresDamaged ? "yes" : "no",
            ["leaksVisible"]          = leaks ? "yes" : "no",
            ["cabinClean"]            = "yes",
            ["brakesOk"]              = brakesOk ? "yes" : "no",
            ["steeringControlsOk"]    = steeringOk ? "yes" : "no",
            ["faultsFound"]           = faultsFound ? "yes" : "no",
            ["safeToOperate"]         = safeToOperate ? "yes" : "no",
            ["operatorSignature"]     = opName,
        };

        if (faultsFound)
        {
            var details = new List<string>();
            if (leaks)          details.Add("oil leak under mast");
            if (visibleDamage)  details.Add("dent on right fender");
            if (tyresDamaged)   details.Add("front left tyre worn");
            if (safetyTampered) details.Add("seatbelt clip taped down");
            if (!brakesOk)      details.Add("brakes slow to respond");
            if (!steeringOk)    details.Add("steering pulls left");
            if (!safeToOperate) details.Add("equipment must not be operated");

            data["faultDetails"]  = string.Join("; ", details);
            data["urgencyLevel"]  = urgencyLevel;
        }

        if (!safeToOperate)
            data["unsafeReason"] = "Critical faults detected — see fault details";

        return data;
    }

    private static async Task SeedRuleLogsAsync(
        AppDbContext db,
        FormSubmission submission,
        int formId,
        string outcome,
        string machineId,
        string opName,
        string empId,
        DateTime submittedAt)
    {
        // Find seeded rules for this form
        var intRules   = await db.FormIntegrationRules
            .AsNoTracking()
            .Where(r => r.FormId == formId && r.Enabled)
            .ToListAsync();
        var notifRules = await db.FormNotificationRules
            .AsNoTracking()
            .Where(r => r.FormId == formId && r.Enabled)
            .ToListAsync();

        var machineName = Forklifts.First(f => f.ExternalId == machineId).DisplayName;
        var woRef = $"WO-{submission.Id:D5}";

        if (outcome == "warning")
        {
            // Damage rule fires (rule 0 — damage reported)
            var rule = intRules.FirstOrDefault();
            if (rule != null)
                db.SubmissionRuleLogs.Add(MexLog(submission.Id, rule.Id, rule.Name, submittedAt, woRef));

            // Leak/safety notification fires (notif rule 0)
            var notif = notifRules.FirstOrDefault();
            if (notif != null)
                db.SubmissionRuleLogs.Add(EmailLog(submission.Id, notif.Id, notif.Name, submittedAt));
        }
        else if (outcome == "critical")
        {
            // Both integration rules fire
            foreach (var rule in intRules)
                db.SubmissionRuleLogs.Add(MexLog(submission.Id, rule.Id, rule.Name, submittedAt,
                    rule.SortOrder == 0 ? woRef : $"WO-{submission.Id + 1000:D5}"));

            // Both notification rules fire
            foreach (var notif in notifRules)
                db.SubmissionRuleLogs.Add(EmailLog(submission.Id, notif.Id, notif.Name, submittedAt));
        }

        await db.SaveChangesAsync();
    }

    private static SubmissionRuleLog MexLog(int submissionId, int ruleId, string ruleName, DateTime at, string woRef) =>
        new()
        {
            SubmissionId  = submissionId,
            RuleId        = ruleId,
            RuleName      = ruleName,
            RuleType      = "integration",
            Channel       = "mex",
            Action        = "create_request",
            Status        = "success",
            ResponseJson  = JsonSerializer.Serialize(new { requestNumber = woRef }),
            StatusCode    = 200,
            TriggeredAt   = at.AddSeconds(2),
            CompletedAt   = at.AddSeconds(4),
        };

    private static SubmissionRuleLog EmailLog(int submissionId, int ruleId, string ruleName, DateTime at) =>
        new()
        {
            SubmissionId  = submissionId,
            RuleId        = ruleId,
            RuleName      = ruleName,
            RuleType      = "notification",
            Channel       = "email",
            Status        = "success",
            TriggeredAt   = at.AddSeconds(1),
            CompletedAt   = at.AddSeconds(3),
        };
}
