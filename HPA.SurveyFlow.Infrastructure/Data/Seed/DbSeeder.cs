using Microsoft.EntityFrameworkCore;
using HPA.SurveyFlow.Domain.Entities;
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

        await db.SaveChangesAsync();
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
