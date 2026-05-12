using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HPA.SurveyFlow.Domain.DTOs.Responses;
using HPA.SurveyFlow.Domain.Entities;
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
            LogoCollapsedSize = dict.GetValueOrDefault("logoCollapsedSize")
        };
    }
}
