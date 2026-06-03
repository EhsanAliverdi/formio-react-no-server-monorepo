namespace HPA.SurveyFlow.Infrastructure.Data.Seed;

/// <summary>
/// Controls which categories of demo/seed data are created on startup.
/// All flags default to false — opt in explicitly via env vars or appsettings.
/// </summary>
public sealed class SeedOptions
{
    // ── Who to create ────────────────────────────────────────────────────────

    /// <summary>Create the admin superuser (requires ADMIN_EMAIL + ADMIN_PASSWORD).</summary>
    public bool AdminUser { get; init; }
    public string? AdminEmail { get; init; }
    public string? AdminPassword { get; init; }

    /// <summary>Create demo accounts for every non-admin role (editor, viewer, supervisor, operator).</summary>
    public bool DemoUsers { get; init; }

    // ── What to seed ─────────────────────────────────────────────────────────

    /// <summary>Seed pre-start form schemas.</summary>
    public bool Forms { get; init; }

    /// <summary>Seed demo integration and notification rules.</summary>
    public bool Rules { get; init; }

    /// <summary>Seed demo report templates.</summary>
    public bool Reports { get; init; }

    /// <summary>Seed the Forklift operations dashboard wired to the seeded report templates.</summary>
    public bool Dashboards { get; init; }

    /// <summary>Seed 20 demo forklift submissions spread over the last 10 days, with rule logs.</summary>
    public bool Submissions { get; init; }

    /// <summary>Seed demo datasets.</summary>
    public bool Datasets { get; init; }

    /// <summary>Seed demo scheduled reports.</summary>
    public bool Schedules { get; init; }

    // ── Behaviour modifiers ───────────────────────────────────────────────────

    /// <summary>
    /// When true, update existing seed records with the latest seed data values.
    /// Has no effect if the record does not exist yet.
    /// </summary>
    public bool OverrideExisting { get; init; }

    /// <summary>
    /// When true, DELETE all existing seed records for the enabled categories before
    /// re-inserting them.  Gives a clean slate — use in dev/CI, never in production.
    /// Takes precedence over OverrideExisting.
    /// </summary>
    public bool Reset { get; init; }
}
