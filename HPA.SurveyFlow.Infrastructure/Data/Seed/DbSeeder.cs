using Microsoft.EntityFrameworkCore;
using HPA.SurveyFlow.Domain.Entities;
using HPA.SurveyFlow.Infrastructure.Jobs.Implementations;
using HPA.SurveyFlow.Infrastructure.Services;

namespace HPA.SurveyFlow.Infrastructure.Data.Seed;

public static class DbSeeder
{
    /// <param name="opts">Controls which categories of seed data run and whether to reset/override existing rows.</param>
    public static async Task SeedAsync(AppDbContext db, SeedOptions opts, StorageService? storage = null)
    {
        await db.Database.MigrateAsync();

        await SeedSiteSettingsAsync(db);

        if (opts.AdminUser)
            await SeedAdminUserAsync(db, opts.AdminEmail, opts.AdminPassword);

        if (opts.DemoUsers)
            await SeedDemoUsersAsync(db);

        if (opts.Forms)
        {
            if (opts.Reset) await ResetFormsAsync(db);
            await SeedFormsAsync(db, opts.OverrideExisting);
            if (storage != null)
                await SeedFormImagesAsync(db, storage, opts.OverrideExisting);
        }

        if (opts.Rules)
        {
            if (opts.Reset) await ResetRulesAsync(db);
            await DemoRulesSeedData.SeedAsync(db, opts.OverrideExisting);
        }

        if (opts.Reports)
        {
            if (opts.Reset) await ResetReportsAsync(db);
            await DemoReportTemplatesSeedData.SeedAsync(db, opts.OverrideExisting);
        }

        if (opts.Datasets)
        {
            if (opts.Reset) await ResetDatasetsAsync(db);
            await DemoDatasetsAndSchedulesSeedData.SeedDatasetsAsync(db, opts.OverrideExisting);
        }

        if (opts.Schedules)
        {
            if (opts.Reset) await ResetSchedulesAsync(db);
            await DemoDatasetsAndSchedulesSeedData.SeedSchedulesAsync(db, opts.OverrideExisting);
        }

        await SeedJobDefinitionsAsync(db);

        await db.SaveChangesAsync();
    }

    // ── Site settings (always runs — idempotent) ───────────────────────────────

    private static async Task SeedSiteSettingsAsync(AppDbContext db)
    {
        var defaults = new Dictionary<string, string>
        {
            ["siteName"]               = "SurveyFlow",
            ["faviconUrl"]             = "/images/logo/favicon.svg",
            ["logoExpandedLightUrl"]   = "/images/logo/logo.svg",
            ["logoExpandedDarkUrl"]    = "/images/logo/logo-dark.svg",
            ["logoCollapsedUrl"]       = "/images/logo/logo-icon.svg",
            ["logoExpandedWidth"]      = "170",
            ["logoExpandedHeight"]     = "40",
            ["logoCollapsedSize"]      = "40",
            ["copyrightText"]          = "",
            ["showCopyright"]          = "false",
            ["showPublicFormLogo"]     = "false",
        };

        foreach (var (key, value) in defaults)
        {
            var existing = await db.SiteSettings.FindAsync(key);
            if (existing is null)
                db.SiteSettings.Add(new SiteSetting { Key = key, Value = value });
            else if (string.IsNullOrWhiteSpace(existing.Value))
                existing.Value = value;
        }
    }

    // ── Admin user ────────────────────────────────────────────────────────────

    private static async Task SeedAdminUserAsync(AppDbContext db, string? adminEmail, string? adminPassword)
    {
        if (string.IsNullOrWhiteSpace(adminEmail))
            throw new InvalidOperationException("SEED_ADMIN_USER is enabled but ADMIN_EMAIL is not set.");
        if (string.IsNullOrWhiteSpace(adminPassword))
            throw new InvalidOperationException("SEED_ADMIN_USER is enabled but ADMIN_PASSWORD is not set.");

        if (!await db.Users.AnyAsync(u => u.Email == adminEmail))
        {
            var auth = new AuthService(db);
            db.Users.Add(new User
            {
                Email        = adminEmail,
                PasswordHash = auth.HashPassword(adminPassword),
                Role         = "admin",
                IsActive     = true,
                DisplayName  = "Administrator",
            });
        }
    }

    // ── Demo users ────────────────────────────────────────────────────────────

    private static async Task SeedDemoUsersAsync(AppDbContext db)
    {
        var auth = new AuthService(db);
        var demoUsers = new[]
        {
            new { Email = "editor@demo.local",    Role = "editor",     DisplayName = "Demo Editor",     JobTitle = "Form Editor" },
            new { Email = "viewer@demo.local",     Role = "viewer",     DisplayName = "Demo Viewer",     JobTitle = "Report Viewer" },
            new { Email = "supervisor@demo.local", Role = "supervisor", DisplayName = "Demo Supervisor", JobTitle = "Site Supervisor" },
            new { Email = "operator@demo.local",   Role = "operator",   DisplayName = "Demo Operator",   JobTitle = "Equipment Operator" },
        };

        foreach (var u in demoUsers)
        {
            if (!await db.Users.AnyAsync(x => x.Email == u.Email))
            {
                db.Users.Add(new User
                {
                    Email        = u.Email,
                    PasswordHash = auth.HashPassword("Demo1234!"),
                    Role         = u.Role,
                    IsActive     = true,
                    DisplayName  = u.DisplayName,
                    JobTitle     = u.JobTitle,
                });
            }
        }
    }

    // ── Reset helpers ─────────────────────────────────────────────────────────

    private static async Task ResetFormsAsync(AppDbContext db)
    {
        var seedNames = PreStartFormsSeedData.ActiveSeedFormNames
            .Concat(PreStartFormsSeedData.RetiredSeedFormNames)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        var forms = await db.Forms.Where(f => seedNames.Contains(f.Name)).ToListAsync();
        if (forms.Count > 0) db.Forms.RemoveRange(forms);
        await db.SaveChangesAsync();
    }

    private static async Task ResetRulesAsync(AppDbContext db)
    {
        // Remove all integration + notification rules tied to seed forms
        var seedFormNames = PreStartFormsSeedData.ActiveSeedFormNames.ToList();
        var formIds = await db.Forms.Where(f => seedFormNames.Contains(f.Name)).Select(f => f.Id).ToListAsync();
        if (formIds.Count == 0) return;
        var intRules = await db.FormIntegrationRules.Where(r => formIds.Contains(r.FormId)).ToListAsync();
        var notifRules = await db.FormNotificationRules.Where(r => formIds.Contains(r.FormId)).ToListAsync();
        if (intRules.Count > 0)   db.FormIntegrationRules.RemoveRange(intRules);
        if (notifRules.Count > 0) db.FormNotificationRules.RemoveRange(notifRules);
        await db.SaveChangesAsync();
    }

    private static async Task ResetReportsAsync(AppDbContext db)
    {
        var seedFormNames = PreStartFormsSeedData.ActiveSeedFormNames.ToList();
        var formIds = await db.Forms.Where(f => seedFormNames.Contains(f.Name)).Select(f => f.Id).ToListAsync();
        if (formIds.Count == 0) return;
        var templates = await db.ReportTemplates.Where(t => formIds.Contains(t.FormId)).ToListAsync();
        if (templates.Count > 0) db.ReportTemplates.RemoveRange(templates);
        await db.SaveChangesAsync();
    }

    private static async Task ResetDatasetsAsync(AppDbContext db)
    {
        var seedFormNames = PreStartFormsSeedData.ActiveSeedFormNames.ToList();
        var formIds = await db.Forms.Where(f => seedFormNames.Contains(f.Name)).Select(f => f.Id).ToListAsync();
        if (formIds.Count == 0) return;
        var datasets = await db.Datasets.Where(d => formIds.Contains(d.FormId)).ToListAsync();
        if (datasets.Count > 0) db.Datasets.RemoveRange(datasets);
        await db.SaveChangesAsync();
    }

    private static async Task ResetSchedulesAsync(AppDbContext db)
    {
        var seedFormNames = PreStartFormsSeedData.ActiveSeedFormNames.ToList();
        var formIds = await db.Forms.Where(f => seedFormNames.Contains(f.Name)).Select(f => f.Id).ToListAsync();
        if (formIds.Count == 0) return;
        var templateIds = await db.ReportTemplates.Where(t => formIds.Contains(t.FormId)).Select(t => t.Id).ToListAsync();
        if (templateIds.Count == 0) return;
        var schedules = await db.ScheduledReports.Where(s => templateIds.Contains(s.ReportTemplateId)).ToListAsync();
        if (schedules.Count > 0) db.ScheduledReports.RemoveRange(schedules);
        await db.SaveChangesAsync();
    }

    // ── Forms ──────────────────────────────────────────────────────────────────

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

            string? existingImage = null;
            try
            {
                using var doc = System.Text.Json.JsonDocument.Parse(form.Json);
                if (doc.RootElement.TryGetProperty("appSettings", out var appSettings))
                {
                    if (appSettings.TryGetProperty("categoryImage", out var imgProp) &&
                        imgProp.ValueKind == System.Text.Json.JsonValueKind.String)
                        existingImage = imgProp.GetString();
                    else if (appSettings.TryGetProperty("preStartImage", out var legacyImgProp) &&
                             legacyImgProp.ValueKind == System.Text.Json.JsonValueKind.String)
                        existingImage = legacyImgProp.GetString();
                }
            }
            catch { }

            if (!overrideExisting && !string.IsNullOrWhiteSpace(existingImage))
                continue;

            var bytes = await File.ReadAllBytesAsync(imagePath);
            var ext = Path.GetExtension(definition.SeedImageFileName).ToLowerInvariant();
            var contentType = ext == ".png" ? "image/png" : ext is ".jpg" or ".jpeg" ? "image/jpeg" : "image/png";
            await storage.UploadAsync(key, bytes, contentType, "public, max-age=31536000, immutable");
            form.Json = PatchCategoryImage(form.Json, imageUrl);
        }

        await db.SaveChangesAsync();
    }

    private static string PatchCategoryImage(string existingJson, string imageUrl)
    {
        try
        {
            var dict = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, System.Text.Json.JsonElement>>(existingJson)!;
            if (dict.TryGetValue("appSettings", out var appSettingsEl))
            {
                var appSettings = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, System.Text.Json.JsonElement>>(appSettingsEl.GetRawText())!;
                appSettings["categoryImage"] = System.Text.Json.JsonSerializer.SerializeToElement(imageUrl);
                dict["appSettings"] = System.Text.Json.JsonSerializer.SerializeToElement(appSettings);
            }
            return System.Text.Json.JsonSerializer.Serialize(dict);
        }
        catch { return existingJson; }
    }

    // ── Job definitions (always runs — idempotent) ─────────────────────────────

    private static async Task SeedJobDefinitionsAsync(AppDbContext db)
    {
        if (!await db.ScheduledJobDefinitions.AnyAsync(j => j.JobKey == MexAssetSyncJob.JobKey))
        {
            db.ScheduledJobDefinitions.Add(new ScheduledJobDefinition
            {
                JobKey          = MexAssetSyncJob.JobKey,
                JobType         = typeof(MexAssetSyncJob).FullName!,
                DisplayName     = "MEX Asset Sync",
                Description     = "Fetches all assets from MEX Maintenance and caches them locally for use in form dropdowns.",
                CronExpression  = "0 0 * * * ?",
                IsEnabled       = false,
                ParameterSchema = """["dateFrom","dateTo","fullHistorical"]""",
            });
        }
        else
        {
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
                CronExpression = "0 30 2 * * ?",
                IsEnabled      = false,
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
                    Name                 = seedForm.Name,
                    Json                 = json,
                    AllowAnonymousSubmit = true,
                    Visibility           = "public",
                });
                continue;
            }

            if (!overrideExisting) continue;
            existingForm.Json                 = json;
            existingForm.AllowAnonymousSubmit = true;
            existingForm.Visibility           = "public";
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
            var parent          = await db.Forms.FirstOrDefaultAsync(f => f.Name == definition.ParentFormName);
            var acknowledgement = await db.Forms.FirstOrDefaultAsync(f => f.Name == definition.AcknowledgementFormName);
            if (parent is null || acknowledgement is null) continue;

            acknowledgement.ParentFormId = parent.Id;

            if (overrideExisting)
            {
                parent.Json = DemoEquipmentMexFlowSeedData.CreateParent(definition, acknowledgement.Id).Schema.GetRawText();
            }
            else
            {
                parent.Json = PatchNextFormsWarning(parent.Json, acknowledgement.Id);
                parent.Json = PatchCategorySettings(parent.Json, "pre-start", "Pre-Start", definition.IconKey);
                acknowledgement.Json = PatchCategorySettings(acknowledgement.Json, "pre-start", "Pre-Start", null);
            }
        }
    }

    private static string PatchCategorySettings(string existingJson, string categorySlug, string categoryName, string? iconKey)
    {
        try
        {
            var dict = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, System.Text.Json.JsonElement>>(existingJson)!;
            var appSettings = dict.TryGetValue("appSettings", out var appSettingsEl)
                ? System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, System.Text.Json.JsonElement>>(appSettingsEl.GetRawText())!
                : new Dictionary<string, System.Text.Json.JsonElement>();

            appSettings["categorySlug"] = System.Text.Json.JsonSerializer.SerializeToElement(categorySlug);
            appSettings["categoryName"] = System.Text.Json.JsonSerializer.SerializeToElement(categoryName);
            if (iconKey is not null)
            {
                appSettings["categoryIcon"]         = System.Text.Json.JsonSerializer.SerializeToElement(iconKey);
                appSettings["formsListIconKey"]      = System.Text.Json.JsonSerializer.SerializeToElement(iconKey);
                appSettings["showIconInFormsList"]   = System.Text.Json.JsonSerializer.SerializeToElement(true);
            }

            dict["appSettings"] = System.Text.Json.JsonSerializer.SerializeToElement(appSettings);
            return System.Text.Json.JsonSerializer.Serialize(dict);
        }
        catch { return existingJson; }
    }

    private static string PatchNextFormsWarning(string existingJson, int warningFormId)
    {
        try
        {
            var dict = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, System.Text.Json.JsonElement>>(existingJson)!;
            if (dict.TryGetValue("appSettings", out var appSettingsEl))
            {
                var appSettings = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, System.Text.Json.JsonElement>>(appSettingsEl.GetRawText())!;
                if (appSettings.TryGetValue("nextForms", out var nextFormsEl))
                {
                    var nextForms = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, System.Text.Json.JsonElement>>(nextFormsEl.GetRawText())!;
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
        catch { return existingJson; }
    }

    private static async Task RetireOldSeedFormsAsync(AppDbContext db)
    {
        var retiredNames = PreStartFormsSeedData.RetiredSeedFormNames
            .Except(PreStartFormsSeedData.ActiveSeedFormNames, StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (retiredNames.Count == 0) return;

        var retiredForms = await db.Forms.Where(f => retiredNames.Contains(f.Name)).ToListAsync();
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
                form.Visibility           = "restricted";
                form.AllowAnonymousSubmit = false;
                continue;
            }
            db.Forms.Remove(form);
        }
    }
}
