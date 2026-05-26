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
        bool seedForms,
        bool overrideExisting = false,
        StorageService? storage = null)
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
            ["copyrightText"] = "",
            ["showCopyright"] = "false",
            ["showPublicFormLogo"] = "false",
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
            await SeedFormsAsync(db, overrideExisting);
            if (storage != null)
                await SeedFormImagesAsync(db, storage, overrideExisting);
        }

        await SeedJobDefinitionsAsync(db);

        await db.SaveChangesAsync();
    }

    private static async Task SeedFormImagesAsync(AppDbContext db, StorageService storage, bool overrideExisting)
    {
        var seedDir = Path.Combine(AppContext.BaseDirectory, "Seed", "images");
        if (!Directory.Exists(seedDir)) return;

        foreach (var definition in DemoEquipmentMexFlowSeedData.Definitions)
        {
            if (definition.SeedImageFileName is null) continue;

            var imagePath = Path.Combine(seedDir, definition.SeedImageFileName);
            if (!File.Exists(imagePath)) continue;

            var form = await db.Forms.FirstOrDefaultAsync(f => f.Name == definition.ParentFormName);
            if (form is null) continue;

            var key = $"images/seed/{definition.SeedImageFileName}";
            var imageUrl = $"/api/uploads/{key}";

            // Parse existing preStartImage to decide whether to upload/patch
            var existingJson = form.Json;
            string? existingImage = null;
            try
            {
                using var doc = System.Text.Json.JsonDocument.Parse(existingJson);
                if (doc.RootElement.TryGetProperty("appSettings", out var appSettings) &&
                    appSettings.TryGetProperty("preStartImage", out var imgProp) &&
                    imgProp.ValueKind == System.Text.Json.JsonValueKind.String)
                    existingImage = imgProp.GetString();
            }
            catch { }

            // Skip upload and patch if the form already has a user-set image and we're not overriding
            if (!overrideExisting && !string.IsNullOrWhiteSpace(existingImage))
                continue;

            // Upload to MinIO (always — idempotent, same key each time)
            var bytes = await File.ReadAllBytesAsync(imagePath);
            var ext = Path.GetExtension(definition.SeedImageFileName).ToLowerInvariant();
            var contentType = ext == ".png" ? "image/png" : ext == ".jpg" || ext == ".jpeg" ? "image/jpeg" : "image/png";
            await storage.UploadAsync(key, bytes, contentType, "public, max-age=31536000, immutable");

            // Patch preStartImage into the form JSON
            form.Json = PatchPreStartImage(existingJson, imageUrl);
        }

        await db.SaveChangesAsync();
    }

    private static string PatchPreStartImage(string existingJson, string imageUrl)
    {
        try
        {
            var dict = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, System.Text.Json.JsonElement>>(existingJson)!;
            if (dict.TryGetValue("appSettings", out var appSettingsEl))
            {
                var appSettings = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, System.Text.Json.JsonElement>>(appSettingsEl.GetRawText())!;
                appSettings["preStartImage"] = System.Text.Json.JsonSerializer.SerializeToElement(imageUrl);
                dict["appSettings"] = System.Text.Json.JsonSerializer.SerializeToElement(appSettings);
            }
            return System.Text.Json.JsonSerializer.Serialize(dict);
        }
        catch
        {
            return existingJson;
        }
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


    private static async Task SeedFormsAsync(AppDbContext db, bool overrideExisting)
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

            if (!overrideExisting) continue;

            existingForm.Json = json;
            existingForm.AllowAnonymousSubmit = true;
            existingForm.Visibility = "public";
        }

        await db.SaveChangesAsync();
        await LinkEquipmentMexFlowDemosAsync(db, overrideExisting);
        await RetireOldSeedFormsAsync(db);
        await db.SaveChangesAsync();
    }

    private static async Task LinkEquipmentMexFlowDemosAsync(AppDbContext db, bool overrideExisting)
    {
        foreach (var definition in DemoEquipmentMexFlowSeedData.Definitions)
        {
            var parent = await db.Forms.FirstOrDefaultAsync(f => f.Name == definition.ParentFormName);
            var acknowledgement = await db.Forms.FirstOrDefaultAsync(f => f.Name == definition.AcknowledgementFormName);
            if (parent is null || acknowledgement is null) continue;

            acknowledgement.ParentFormId = parent.Id;

            if (overrideExisting)
            {
                // Full replace — safe because we are intentionally overriding
                parent.Json = DemoEquipmentMexFlowSeedData.CreateParent(definition, acknowledgement.Id).Schema.GetRawText();
            }
            else
            {
                // Patch only nextForms.warning inside the existing JSON so user edits
                // (e.g. preStartImage) are preserved
                parent.Json = PatchNextFormsWarning(parent.Json, acknowledgement.Id);
            }
        }
    }

    private static string PatchNextFormsWarning(string existingJson, int warningFormId)
    {
        try
        {
            using var doc = System.Text.Json.JsonDocument.Parse(existingJson);
            var root = doc.RootElement.Clone();
            var dict = System.Text.Json.JsonSerializer.Deserialize<System.Collections.Generic.Dictionary<string, System.Text.Json.JsonElement>>(existingJson)!;

            // Navigate appSettings.nextForms.warning and patch it
            if (dict.TryGetValue("appSettings", out var appSettingsEl))
            {
                var appSettings = System.Text.Json.JsonSerializer.Deserialize<System.Collections.Generic.Dictionary<string, System.Text.Json.JsonElement>>(appSettingsEl.GetRawText())!;
                if (appSettings.TryGetValue("nextForms", out var nextFormsEl))
                {
                    var nextForms = System.Text.Json.JsonSerializer.Deserialize<System.Collections.Generic.Dictionary<string, System.Text.Json.JsonElement>>(nextFormsEl.GetRawText())!;
                    nextForms["warning"] = System.Text.Json.JsonSerializer.SerializeToElement(warningFormId);
                    appSettings["nextForms"] = System.Text.Json.JsonSerializer.SerializeToElement(nextForms);
                }
                else
                {
                    appSettings["nextForms"] = System.Text.Json.JsonSerializer.SerializeToElement(
                        new { success = (int?)null, warning = warningFormId, error = (int?)null });
                }
                dict["appSettings"] = System.Text.Json.JsonSerializer.SerializeToElement(appSettings);
            }

            return System.Text.Json.JsonSerializer.Serialize(dict);
        }
        catch
        {
            // If parsing fails fall back to leaving the JSON untouched
            return existingJson;
        }
    }

    private static async Task RetireOldSeedFormsAsync(AppDbContext db)
    {
        var retiredNames = PreStartFormsSeedData.RetiredSeedFormNames
            .Except(PreStartFormsSeedData.ActiveSeedFormNames, StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (retiredNames.Count == 0) return;

        var retiredForms = await db.Forms
            .Where(f => retiredNames.Contains(f.Name))
            .ToListAsync();

        if (retiredForms.Count == 0) return;

        var formIdsWithSubmissions = await db.FormSubmissions
            .Where(s => retiredForms.Select(f => f.Id).Contains(s.FormId))
            .Select(s => s.FormId)
            .Distinct()
            .ToListAsync();

        foreach (var form in retiredForms)
        {
            if (formIdsWithSubmissions.Contains(form.Id))
            {
                form.Visibility = "restricted";
                form.AllowAnonymousSubmit = false;
                continue;
            }

            db.Forms.Remove(form);
        }
    }
}
