using Microsoft.EntityFrameworkCore;
using HPA.SurveyFlow.Domain.Entities;
using HPA.SurveyFlow.Infrastructure.Jobs.Implementations;
using HPA.SurveyFlow.Infrastructure.Services;

namespace HPA.SurveyFlow.Infrastructure.Data.Seed;

public static class DbSeeder
{
    public static async Task SeedAsync(
        AppDbContext db,
        bool seedAdminUser,
        string? adminEmail,
        string? adminPassword,
        bool seedForms)
    {
        await db.Database.MigrateAsync();

        // Seed default site settings
        var defaultSettings = new Dictionary<string, string>
        {
            ["siteName"] = "SurveyFlow",
            ["faviconUrl"] = "/images/logo/favicon.svg",
            ["logoExpandedLightUrl"] = "/images/logo/logo.svg",
            ["logoExpandedDarkUrl"] = "/images/logo/logo-dark.svg",
            ["logoCollapsedUrl"] = "/images/logo/logo-icon.svg",
            ["logoExpandedWidth"] = "170",
            ["logoExpandedHeight"] = "40",
            ["logoCollapsedSize"] = "40",
        };

        foreach (var (key, value) in defaultSettings)
        {
            var existingSetting = await db.SiteSettings.FindAsync(key);

            if (existingSetting is null)
            {
                db.SiteSettings.Add(new SiteSetting { Key = key, Value = value });
                continue;
            }

            if (string.IsNullOrWhiteSpace(existingSetting.Value))
            {
                existingSetting.Value = value;
            }
        }

        // Seed superuser
        if (seedAdminUser)
        {
            if (string.IsNullOrWhiteSpace(adminEmail))
            {
                throw new InvalidOperationException("Admin seeding is enabled, but no admin email was configured.");
            }

            if (string.IsNullOrWhiteSpace(adminPassword))
            {
                throw new InvalidOperationException("Admin seeding is enabled, but no admin password was configured.");
            }

            if (!await db.Users.AnyAsync(u => u.Email == adminEmail))
            {
                var authService = new AuthService(db);
                db.Users.Add(new User
                {
                    Email = adminEmail,
                    PasswordHash = authService.HashPassword(adminPassword),
                    Role = "admin",
                    IsActive = true,
                    DisplayName = "Administrator"
                });
            }
        }

        if (seedForms)
        {
            await SeedFormsAsync(db);
        }

        await SeedJobDefinitionsAsync(db);

        await db.SaveChangesAsync();
    }

    private static async Task SeedJobDefinitionsAsync(AppDbContext db)
    {
        // Seed the MEX Asset Sync job definition if it doesn't already exist.
        // Disabled by default — only activates once MEX integration is configured.
        if (!await db.ScheduledJobDefinitions.AnyAsync(j => j.JobKey == MexAssetSyncJob.JobKey))
        {
            db.ScheduledJobDefinitions.Add(new ScheduledJobDefinition
            {
                JobKey         = MexAssetSyncJob.JobKey,
                JobType        = typeof(MexAssetSyncJob).FullName!,
                DisplayName    = "MEX Asset Sync",
                Description    = "Fetches all assets from MEX Maintenance and caches them locally for use in form dropdowns.",
                CronExpression = "0 0 * * * ?",   // every hour at :00
                IsEnabled      = false,
                // Declares which manual-trigger parameters this job supports
                ParameterSchema = """["dateFrom","dateTo","fullHistorical"]""",
            });
        }
        else
        {
            // Ensure existing seeded record has the parameter schema
            var existing = await db.ScheduledJobDefinitions.FirstAsync(j => j.JobKey == MexAssetSyncJob.JobKey);
            if (existing.ParameterSchema is null)
                existing.ParameterSchema = """["dateFrom","dateTo","fullHistorical"]""";
        }

        if (!await db.ScheduledJobDefinitions.AnyAsync(j => j.JobKey == MexGapFillJob.JobKey))
        {
            db.ScheduledJobDefinitions.Add(new ScheduledJobDefinition
            {
                JobKey         = MexGapFillJob.JobKey,
                JobType        = typeof(MexGapFillJob).FullName!,
                DisplayName    = "MEX Gap Fill",
                Description    = "Finds all numeric ID gaps in the synced MEX assets range and fetches missing assets one by one from /Asset/{id}.",
                CronExpression = "0 30 2 * * ?",  // daily at 02:30 — runs after the hourly sync
                IsEnabled      = false,            // enable once MEX is configured
                SyncMode       = "full",
            });
        }
    }


    private static async Task SeedFormsAsync(AppDbContext db)
    {
        foreach (var seedForm in PreStartFormsSeedData.Forms)
        {
            var json = seedForm.Schema.GetRawText();
            var existingForm = await db.Forms.FirstOrDefaultAsync(f => f.Name == seedForm.Name);

            if (existingForm is null)
            {
                db.Forms.Add(new Form
                {
                    Name = seedForm.Name,
                    Json = json,
                    AllowAnonymousSubmit = true,
                    Visibility = "public",
                });

                continue;
            }

            existingForm.Json = json;
            existingForm.AllowAnonymousSubmit = true;
            existingForm.Visibility = "public";
        }
    }
}
