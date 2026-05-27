using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HPA.SurveyFlow.Api.Authorization;
using HPA.SurveyFlow.Domain.DTOs.Requests;
using HPA.SurveyFlow.Domain.DTOs.Responses;
using HPA.SurveyFlow.Domain.Entities;
using HPA.SurveyFlow.Domain.Security;
using HPA.SurveyFlow.Infrastructure.Data;

namespace HPA.SurveyFlow.Api.Controllers;

[ApiController]
public class SettingsController(AppDbContext db) : ControllerBase
{
    [HttpGet("api/settings/site")]
    public async Task<IActionResult> GetSiteSettings()
    {
        var settings = await db.SiteSettings.ToListAsync();
        return Ok(BuildSiteSettingsDto(settings));
    }

    [RequirePermission(Permissions.Admin.ManageSettings)]
    [HttpPut("api/settings/site")]
    public async Task<IActionResult> UpdateSiteSettings([FromBody] UpdateSiteSettingsRequest body)
    {
        var updates = new Dictionary<string, string?>();
        if (body.SiteName != null) updates["siteName"] = body.SiteName;
        if (body.FaviconUrl != null) updates["faviconUrl"] = body.FaviconUrl;
        if (body.LogoExpandedLightUrl != null) updates["logoExpandedLightUrl"] = body.LogoExpandedLightUrl;
        if (body.LogoExpandedDarkUrl != null) updates["logoExpandedDarkUrl"] = body.LogoExpandedDarkUrl;
        if (body.LogoCollapsedUrl != null) updates["logoCollapsedUrl"] = body.LogoCollapsedUrl;
        if (body.LogoExpandedWidth != null) updates["logoExpandedWidth"] = body.LogoExpandedWidth;
        if (body.LogoExpandedHeight != null) updates["logoExpandedHeight"] = body.LogoExpandedHeight;
        if (body.LogoCollapsedSize != null) updates["logoCollapsedSize"] = body.LogoCollapsedSize;
        if (body.CopyrightText != null) updates["copyrightText"] = body.CopyrightText;
        if (body.ShowCopyright != null) updates["showCopyright"] = body.ShowCopyright.Value ? "true" : "false";
        if (body.ShowPublicFormLogo != null) updates["showPublicFormLogo"] = body.ShowPublicFormLogo.Value ? "true" : "false";

        foreach (var (key, value) in updates)
        {
            if (value == null) continue;
            var existing = await db.SiteSettings.FindAsync(key);
            if (existing != null)
                existing.Value = value;
            else
                db.SiteSettings.Add(new SiteSetting { Key = key, Value = value });
        }

        await db.SaveChangesAsync();

        var allSettings = await db.SiteSettings.ToListAsync();
        return Ok(BuildSiteSettingsDto(allSettings));
    }

    [HttpGet("api/version")]
    public IActionResult GetVersion()
    {
        var version = Environment.GetEnvironmentVariable("APP_VERSION") ?? "1.0.0";
        var buildTime = Environment.GetEnvironmentVariable("BUILD_TIME") ?? "unknown";
        var environment = Environment.GetEnvironmentVariable("APP_ENVIRONMENT") ?? "production";

        return Ok(new
        {
            name = "surveyflow",
            version,
            buildTime,
            environment
        });
    }

    private static SiteSettingsDto BuildSiteSettingsDto(List<SiteSetting> settings)
    {
        var dict = settings.ToDictionary(s => s.Key, s => s.Value);
        return new SiteSettingsDto
        {
            SiteName = dict.GetValueOrDefault("siteName", "SurveyFlow")!,
            FaviconUrl = dict.GetValueOrDefault("faviconUrl"),
            LogoExpandedLightUrl = dict.GetValueOrDefault("logoExpandedLightUrl"),
            LogoExpandedDarkUrl = dict.GetValueOrDefault("logoExpandedDarkUrl"),
            LogoCollapsedUrl = dict.GetValueOrDefault("logoCollapsedUrl"),
            LogoExpandedWidth = dict.GetValueOrDefault("logoExpandedWidth"),
            LogoExpandedHeight = dict.GetValueOrDefault("logoExpandedHeight"),
            LogoCollapsedSize = dict.GetValueOrDefault("logoCollapsedSize"),
            CopyrightText = dict.GetValueOrDefault("copyrightText"),
            ShowCopyright = ParseBool(dict.GetValueOrDefault("showCopyright")),
            ShowPublicFormLogo = ParseBool(dict.GetValueOrDefault("showPublicFormLogo"))
        };
    }

    private static bool ParseBool(string? value) =>
        bool.TryParse(value, out var parsed) && parsed;
}
