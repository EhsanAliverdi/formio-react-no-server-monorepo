using Microsoft.EntityFrameworkCore;
using HPA.SurveyFlow.Domain.Entities;
using HPA.SurveyFlow.Infrastructure.Services;

namespace HPA.SurveyFlow.Infrastructure.Data.Seed;

public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext db, string superuserEmail, string superuserPassword)
    {
        await db.Database.MigrateAsync();

        // Seed default site settings
        var defaultSettings = new Dictionary<string, string>
        {
            ["siteName"] = "SurveyFlow",
            ["faviconUrl"] = "",
            ["logoExpandedLightUrl"] = "",
            ["logoExpandedDarkUrl"] = "",
            ["logoCollapsedUrl"] = "",
            ["logoExpandedWidth"] = "160",
            ["logoExpandedHeight"] = "40",
            ["logoCollapsedSize"] = "32",
        };

        foreach (var (key, value) in defaultSettings)
        {
            if (!await db.SiteSettings.AnyAsync(s => s.Key == key))
                db.SiteSettings.Add(new SiteSetting { Key = key, Value = value });
        }

        // Seed superuser
        if (!await db.Users.AnyAsync(u => u.Email == superuserEmail))
        {
            var authService = new AuthService(db);
            db.Users.Add(new User
            {
                Email = superuserEmail,
                PasswordHash = authService.HashPassword(superuserPassword),
                Role = "admin",
                IsActive = true,
                DisplayName = "Administrator"
            });
        }

        await db.SaveChangesAsync();
    }
}
