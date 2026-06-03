using HPA.SurveyFlow.Domain.Entities;
using HPA.SurveyFlow.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HPA.SurveyFlow.Infrastructure.Data.Seed;

/// <summary>
/// Seeds a Forklift Operations dashboard wired to all 7 Forklift report templates.
/// Layout uses a 12-column GridStack grid (cell height 84px).
///
/// Row 1 (y=0, h=2): 3 number-card KPIs — Leaks 24h | Unsafe Count | Total Submissions
/// Row 2 (y=2, h=4): bar chart (faults by machine, w=8) + pie chart (safe/unsafe, w=4)
/// Row 3 (y=6, h=4): doughnut (urgency, w=4) + summary table (w=8)
/// Row 4 (y=10, h=5): safety issues table (w=6) + declarations table (w=6)
/// </summary>
public static class DemoDashboardSeedData
{
    private const string DashboardSlug = "forklift-ops";
    private const string DashboardName = "Forklift Pre-Start Operations";

    public static async Task SeedAsync(AppDbContext db, bool overrideExisting = false)
    {
        var adminUser = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Role == "admin");
        if (adminUser == null) return;

        var forkliftDef = DemoEquipmentMexFlowSeedData.Definitions[0];
        var form = await db.Forms.AsNoTracking().FirstOrDefaultAsync(f => f.Name == forkliftDef.ParentFormName);
        if (form == null) return;

        // Resolve all 7 report templates by name
        var reportNames = new[]
        {
            "Forklift Pre-Start — Summary by Machine",
            "Forklift Pre-Start — Safety Issues",
            "Forklift Pre-Start — Operator Declarations",
            "Forklift Pre-Start — Faults by Machine",
            "Forklift Pre-Start — Leaks Reported (Last 24 Hours)",
            "Forklift Pre-Start — Safe vs Unsafe to Operate",
            "Forklift Pre-Start — Urgency Level Breakdown",
        };

        var templates = await db.ReportTemplates
            .AsNoTracking()
            .Where(t => t.FormId == form.Id && reportNames.Contains(t.Name))
            .ToListAsync();

        if (templates.Count == 0) return;

        int T(string name) => templates.FirstOrDefault(t => t.Name == name)?.Id ?? 0;

        // Check for existing dashboard
        var existing = await db.Dashboards
            .Include(d => d.Cards)
            .FirstOrDefaultAsync(d => d.Slug == DashboardSlug);

        if (existing != null && !overrideExisting) return;

        if (existing != null)
        {
            db.Dashboards.Remove(existing);
            await db.SaveChangesAsync();
        }

        var dashboard = new Dashboard
        {
            Name             = DashboardName,
            Slug             = DashboardSlug,
            Description      = "Live overview of forklift pre-start activity — fault trends, leak reports, urgency breakdown, and operator declarations.",
            Visibility       = "public",
            IsActive         = true,
            CreatedByUserId  = adminUser.Id,
            CreatedAt        = DateTime.UtcNow,
            UpdatedAt        = DateTime.UtcNow,
        };

        db.Dashboards.Add(dashboard);
        await db.SaveChangesAsync(); // get dashboard.Id

        var cards = new List<DashboardCard>();

        // ── Row 1: KPI number cards (y=0, h=2, each w=4) ─────────────────────

        var leaksId = T("Forklift Pre-Start — Leaks Reported (Last 24 Hours)");
        if (leaksId > 0)
            cards.Add(Card(dashboard.Id, leaksId, "Leaks — Last 24 Hours", x: 0, y: 0, w: 4, h: 2));

        var unsafeId = T("Forklift Pre-Start — Safe vs Unsafe to Operate");
        if (unsafeId > 0)
            cards.Add(Card(dashboard.Id, unsafeId, "Safe vs Unsafe Split", x: 4, y: 0, w: 4, h: 2));

        var summaryId = T("Forklift Pre-Start — Summary by Machine");
        if (summaryId > 0)
            cards.Add(Card(dashboard.Id, summaryId, "All Pre-Starts", x: 8, y: 0, w: 4, h: 2));

        // ── Row 2: Bar chart + pie chart (y=2, h=4) ───────────────────────────

        var faultsByMachineId = T("Forklift Pre-Start — Faults by Machine");
        if (faultsByMachineId > 0)
            cards.Add(Card(dashboard.Id, faultsByMachineId, "Faults by Machine", x: 0, y: 2, w: 8, h: 4));

        if (unsafeId > 0)
            cards.Add(Card(dashboard.Id, unsafeId, "Safe to Operate", x: 8, y: 2, w: 4, h: 4));

        // ── Row 3: Doughnut + Summary table (y=6, h=4) ────────────────────────

        var urgencyId = T("Forklift Pre-Start — Urgency Level Breakdown");
        if (urgencyId > 0)
            cards.Add(Card(dashboard.Id, urgencyId, "Urgency Breakdown", x: 0, y: 6, w: 4, h: 4));

        if (summaryId > 0)
            cards.Add(Card(dashboard.Id, summaryId, "Pre-Start Summary", x: 4, y: 6, w: 8, h: 4));

        // ── Row 4: Safety issues + declarations (y=10, h=5) ───────────────────

        var safetyId = T("Forklift Pre-Start — Safety Issues");
        if (safetyId > 0)
            cards.Add(Card(dashboard.Id, safetyId, "Safety Issues", x: 0, y: 10, w: 6, h: 5));

        var declId = T("Forklift Pre-Start — Operator Declarations");
        if (declId > 0)
            cards.Add(Card(dashboard.Id, declId, "Operator Declarations", x: 6, y: 10, w: 6, h: 5));

        if (cards.Count > 0)
        {
            db.DashboardCards.AddRange(cards);
            await db.SaveChangesAsync();
        }
    }

    private static DashboardCard Card(int dashboardId, int reportTemplateId, string title, int x, int y, int w, int h) =>
        new()
        {
            DashboardId      = dashboardId,
            ReportTemplateId = reportTemplateId,
            TitleOverride    = title,
            X                = x,
            Y                = y,
            W                = w,
            H                = h,
            MinW             = 2,
            MinH             = 2,
            CreatedAt        = DateTime.UtcNow,
            UpdatedAt        = DateTime.UtcNow,
        };
}
