using System.Text.Json;
using HPA.SurveyFlow.Domain.Entities;
using HPA.SurveyFlow.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace HPA.SurveyFlow.Infrastructure.Data.Seed;

internal static class DemoPagesSeedData
{
    private const string FaultFormName = "Report Fault to MEX (Demo)";
    private const string PageSlug = "hutchison-ports";
    private const string LogoFileName = "HUTCHISON PORTS LOGO RGB COLOUR POS.png";
    private static readonly JsonSerializerOptions J = new(JsonSerializerDefaults.Web);

    public static async Task SeedAsync(AppDbContext db, StorageService storage, bool overrideExisting = false, bool reset = false)
    {
        if (reset)
            await ResetAsync(db);

        var form = await SeedFaultFormAsync(db, overrideExisting);
        var logoUrl = await SeedLogoAsync(storage);
        var author = await EnsurePageAuthorAsync(db);

        await SeedHutchisonPageAsync(db, author.Id, form.Id, logoUrl, overrideExisting);
        await db.SaveChangesAsync();
    }

    private static async Task ResetAsync(AppDbContext db)
    {
        var page = await db.Pages.FirstOrDefaultAsync(p => p.Slug == PageSlug);
        if (page is not null)
            db.Pages.Remove(page);

        var form = await db.Forms.FirstOrDefaultAsync(f => f.Name == FaultFormName);
        if (form is not null)
        {
            var submissions = await db.FormSubmissions.Where(s => s.FormId == form.Id).ToListAsync();
            if (submissions.Count > 0) db.FormSubmissions.RemoveRange(submissions);

            var integrationRules = await db.FormIntegrationRules.Where(r => r.FormId == form.Id).ToListAsync();
            if (integrationRules.Count > 0) db.FormIntegrationRules.RemoveRange(integrationRules);

            var notificationRules = await db.FormNotificationRules.Where(r => r.FormId == form.Id).ToListAsync();
            if (notificationRules.Count > 0) db.FormNotificationRules.RemoveRange(notificationRules);

            db.Forms.Remove(form);
        }

        await db.SaveChangesAsync();
    }

    private static async Task<Form> SeedFaultFormAsync(AppDbContext db, bool overrideExisting)
    {
        var schema = BuildFaultFormSchema();
        var json = JsonSerializer.Serialize(schema, J);
        var existing = await db.Forms.FirstOrDefaultAsync(f => f.Name == FaultFormName);

        if (existing is null)
        {
            existing = new Form
            {
                Name = FaultFormName,
                Json = json,
                AllowAnonymousSubmit = true,
                Visibility = "public",
            };
            db.Forms.Add(existing);
            await db.SaveChangesAsync();
            return existing;
        }

        if (overrideExisting)
        {
            existing.Json = json;
            existing.AllowAnonymousSubmit = true;
            existing.Visibility = "public";
            await db.SaveChangesAsync();
        }

        return existing;
    }

    private static object BuildFaultFormSchema() => new
    {
        type = "form",
        display = "form",
        title = FaultFormName,
        name = FaultFormName,
        path = "report-fault-mex-demo",
        appSettings = new
        {
            publicDescription = "Report an equipment fault and create a MEX maintenance request.",
            previewBeforeSubmit = true,
            allowSubmissionPdfExport = true,
            messageOnSuccess = "Fault report submitted. A MEX request will be created in the background.",
            redirectOnSuccess = "/page/hutchison-ports",
            resultActions = new
            {
                success = new { mode = "redirect", delaySeconds = 6 },
                warning = new { mode = "stay", delaySeconds = 0 },
                error = new { mode = "stay", delaySeconds = 0 },
            },
            secondarySubmit = new
            {
                success = new
                {
                    enabled = true,
                    integration = "mex",
                    action = "create_request",
                    responseRefField = "requestNumber",
                    fieldMappings = new
                    {
                        priorityNumber = new { source = "static", value = 2 },
                        asset = new { source = "field", fieldKey = "machineId" },
                        requesterDetails = new
                        {
                            source = "template",
                            template = "Fault reported via SurveyFlow\nReporter: {{field:reporterName}}\nAsset: {{asset_display}}\nSubmission: #{{submission_id}}",
                        },
                        jobDescription = new
                        {
                            source = "template",
                            template = "Fault report\n\nAsset: {{asset_display}}\nReporter: {{field:reporterName}}\nFault details:\n{{field:faultDetails}}\n\nSubmission: #{{submission_id}}",
                        },
                    },
                },
                warning = new { enabled = false, integration = "mex", action = "create_request" },
                error = new { enabled = false, integration = "mex", action = "create_request" },
            },
        },
        components = new object[]
        {
            new
            {
                type = "textfield",
                input = true,
                key = "reporterName",
                label = "Reporter name",
                validate = new { required = true },
            },
            new
            {
                type = "select",
                input = true,
                key = "machineId",
                label = "Machine",
                placeholder = "Type to search machines...",
                dataSrc = "url",
                data = new { url = "/api/data-sources/query/mex?valueField=externalId&limit=300" },
                valueProperty = "value",
                template = "<span>{{ item.assetNumber || item.label }}</span>",
                searchEnabled = true,
                searchField = "q",
                lazyLoad = false,
                validate = new { required = true },
                properties = new { sfSourceKey = "mex-assets", sfValueField = "externalId" },
            },
            new
            {
                type = "textarea",
                input = true,
                key = "faultDetails",
                label = "What is the fault?",
                placeholder = "Describe the fault, symptoms, location, and any immediate safety concern.",
                rows = 6,
                validate = new { required = true },
            },
        },
    };

    private static async Task<string> SeedLogoAsync(StorageService storage)
    {
        var seedDir = Path.Combine(AppContext.BaseDirectory, "Seed", "images");
        var imagePath = Path.Combine(seedDir, LogoFileName);
        var key = $"images/seed/{LogoFileName}";
        var url = $"/api/uploads/images/seed/{Uri.EscapeDataString(LogoFileName)}";

        if (!File.Exists(imagePath))
            return url;

        var bytes = await File.ReadAllBytesAsync(imagePath);
        await storage.UploadAsync(key, bytes, "image/png", "public, max-age=31536000, immutable");
        return url;
    }

    private static async Task<User> EnsurePageAuthorAsync(AppDbContext db)
    {
        var user = await db.Users
            .OrderByDescending(u => u.Role == "admin")
            .ThenBy(u => u.Id)
            .FirstOrDefaultAsync();

        if (user is not null)
            return user;

        var auth = new AuthService(db);
        user = new User
        {
            Email = "admin@example.com",
            PasswordHash = auth.HashPassword("admin12345"),
            Role = "admin",
            IsActive = true,
            DisplayName = "Administrator",
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    private static async Task SeedHutchisonPageAsync(AppDbContext db, int authorId, int faultFormId, string logoUrl, bool overrideExisting)
    {
        var html = BuildPageHtml(faultFormId, logoUrl);
        var css = BuildPageCss();
        var projectJson = BuildProjectJson(html, css, logoUrl);
        var existing = await db.Pages.FirstOrDefaultAsync(p => p.Slug == PageSlug);

        if (existing is null)
        {
            db.Pages.Add(new Page
            {
                Title = "Hutchison Ports",
                Slug = PageSlug,
                Description = "Demo landing page with Hutchison Ports navigation, Report Fault action, and NTRACS iframe.",
                Visibility = "public",
                IsActive = true,
                UseLayout = false,
                ProjectJson = projectJson,
                Html = html,
                Css = css,
                CreatedByUserId = authorId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            });
            return;
        }

        if (!overrideExisting) return;

        existing.Title = "Hutchison Ports";
        existing.Description = "Demo landing page with Hutchison Ports navigation, Report Fault action, and NTRACS iframe.";
        existing.Visibility = "public";
        existing.IsActive = true;
        existing.UseLayout = false;
        existing.ProjectJson = projectJson;
        existing.Html = html;
        existing.Css = css;
        existing.UpdatedAt = DateTime.UtcNow;
    }

    private static string BuildProjectJson(string html, string css, string logoUrl) =>
        JsonSerializer.Serialize(new
        {
            assets = new object[]
            {
                new { type = "image", src = logoUrl, name = LogoFileName },
            },
            styles = Array.Empty<object>(),
            pages = new object[]
            {
                new
                {
                    id = PageSlug,
                    name = "Hutchison Ports",
                    frames = new object[]
                    {
                        new
                        {
                            component = html,
                            styles = css,
                        },
                    },
                },
            },
        }, J);

    private static string BuildPageHtml(int faultFormId, string logoUrl) => $$"""
        <main class="hp-page">
          <nav class="hp-navbar">
            <a class="hp-brand" href="/page/{{PageSlug}}">
              <img src="{{logoUrl}}" alt="Hutchison Ports" />
            </a>
            <div class="hp-menu">
              <button class="hp-menu-button" type="button">Report Fault</button>
              <div class="hp-dropdown">
                <a href="/forms/{{faultFormId}}/fill">Create fault report</a>
              </div>
            </div>
          </nav>
          <section class="hp-frame-section">
            <iframe src="https://hpslsvrngp0001:8080/ntracs/mobile/index.html?SICTL" title="NTRACS" loading="lazy"></iframe>
          </section>
        </main>
        """;

    private static string BuildPageCss() => """
        .hp-page {
          min-height: 100vh;
          background: #f5f7fb;
          color: #111827;
          font-family: Inter, Arial, sans-serif;
        }
        .hp-navbar {
          position: sticky;
          top: 0;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          min-height: 76px;
          padding: 14px 32px;
          border-bottom: 1px solid #d7dde8;
          background: #fff;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
        }
        .hp-brand {
          display: inline-flex;
          align-items: center;
          min-width: 0;
        }
        .hp-brand img {
          display: block;
          width: min(280px, 56vw);
          max-height: 48px;
          object-fit: contain;
        }
        .hp-menu {
          position: relative;
          display: inline-flex;
          align-items: center;
        }
        .hp-menu-button {
          border: 1px solid #005eb8;
          border-radius: 8px;
          background: #005eb8;
          color: #fff;
          cursor: pointer;
          font-size: 14px;
          font-weight: 700;
          padding: 10px 14px;
        }
        .hp-dropdown {
          position: absolute;
          right: 0;
          top: calc(100% + 8px);
          display: none;
          min-width: 210px;
          overflow: hidden;
          border: 1px solid #d7dde8;
          border-radius: 8px;
          background: #fff;
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.18);
        }
        .hp-menu:hover .hp-dropdown,
        .hp-menu:focus-within .hp-dropdown {
          display: block;
        }
        .hp-dropdown a {
          display: block;
          padding: 12px 14px;
          color: #111827;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
        }
        .hp-dropdown a:hover {
          background: #eef5ff;
          color: #005eb8;
        }
        .hp-frame-section {
          height: calc(100vh - 76px);
          padding: 16px;
        }
        .hp-frame-section iframe {
          display: block;
          width: 100%;
          height: 100%;
          border: 1px solid #d7dde8;
          border-radius: 8px;
          background: #fff;
        }
        @media (max-width: 640px) {
          .hp-navbar {
            align-items: flex-start;
            flex-direction: column;
            padding: 14px 18px;
          }
          .hp-menu {
            width: 100%;
          }
          .hp-menu-button {
            width: 100%;
          }
          .hp-dropdown {
            left: 0;
            right: auto;
            width: 100%;
          }
          .hp-frame-section {
            height: calc(100vh - 130px);
            padding: 10px;
          }
        }
        """;
}
