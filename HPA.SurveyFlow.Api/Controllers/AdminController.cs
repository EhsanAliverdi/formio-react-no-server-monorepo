using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using HPA.SurveyFlow.Api.Extensions;
using HPA.SurveyFlow.Domain.DTOs.Requests;
using HPA.SurveyFlow.Domain.DTOs.Responses;
using HPA.SurveyFlow.Domain.Entities;
using HPA.SurveyFlow.Domain.Enums;
using HPA.SurveyFlow.Infrastructure.Data;
using HPA.SurveyFlow.Infrastructure.Services;

namespace HPA.SurveyFlow.Api.Controllers;

[ApiController]
[Route("api/admin")]
public class AdminController(AppDbContext db, PdfService pdfService) : ControllerBase
{
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        try { HttpContext.RequireRole(UserRole.Admin); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        var totalForms = await db.Forms.CountAsync();
        var totalSubmissions = await db.FormSubmissions.CountAsync();
        var submittedForms = await db.FormSubmissions.Select(s => s.FormId).Distinct().CountAsync();
        var today = DateTime.UtcNow.Date;
        var submissionsToday = await db.FormSubmissions.CountAsync(s => s.SubmittedAt >= today);
        var last7Days = DateTime.UtcNow.AddDays(-7);
        var submissionsLast7Days = await db.FormSubmissions.CountAsync(s => s.SubmittedAt >= last7Days);

        return Ok(new
        {
            totalForms,
            totalSubmissions,
            submittedForms,
            submissionsToday,
            submissionsLast7Days
        });
    }

    [HttpGet("activity")]
    public async Task<IActionResult> GetActivity([FromQuery] int limit = 10)
    {
        try { HttpContext.RequireRole(UserRole.Admin); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        limit = Math.Clamp(limit, 1, 50);

        var activities = new List<AdminActivityDto>();

        // Recent submissions
        var recentSubmissions = await db.FormSubmissions
            .Include(s => s.Form)
            .Include(s => s.User)
            .OrderByDescending(s => s.SubmittedAt)
            .Take(limit)
            .ToListAsync();

        foreach (var s in recentSubmissions)
        {
            activities.Add(new AdminActivityDto
            {
                Id = $"submission-{s.Id}",
                Type = "submission",
                OccurredAt = s.SubmittedAt,
                Title = $"New submission on \"{s.Form.Name}\"",
                Summary = s.User != null ? $"Submitted by {s.User.Email}" : "Anonymous submission",
                Actor = s.User != null ? new ActivityActorDto
                {
                    Id = s.User.Id,
                    Email = s.User.Email,
                    DisplayName = s.User.DisplayName,
                    AvatarUrl = s.User.AvatarUrl
                } : null,
                Entity = new ActivityEntityDto { Kind = "submission", Id = s.Id, FormId = s.FormId },
                Link = $"/admin/submissions/{s.Id}"
            });
        }

        // Updated submissions
        var updatedSubmissions = await db.FormSubmissions
            .Include(s => s.Form)
            .Where(s => s.UpdatedAt != null)
            .OrderByDescending(s => s.UpdatedAt)
            .Take(limit)
            .ToListAsync();

        var updaterIds = updatedSubmissions
            .Where(s => s.UpdatedBy.HasValue)
            .Select(s => s.UpdatedBy!.Value)
            .Distinct()
            .ToList();

        var updaters = updaterIds.Count > 0
            ? await db.Users.Where(u => updaterIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id)
            : new Dictionary<int, User>();

        foreach (var s in updatedSubmissions)
        {
            User? updater = s.UpdatedBy.HasValue && updaters.TryGetValue(s.UpdatedBy.Value, out var u) ? u : null;
            activities.Add(new AdminActivityDto
            {
                Id = $"submission_updated-{s.Id}",
                Type = "submission_updated",
                OccurredAt = s.UpdatedAt!.Value,
                Title = $"Submission #{s.Id} updated on \"{s.Form.Name}\"",
                Summary = updater != null ? $"Updated by {updater.Email}" : "Submission updated",
                Actor = updater != null ? new ActivityActorDto
                {
                    Id = updater.Id,
                    Email = updater.Email,
                    DisplayName = updater.DisplayName,
                    AvatarUrl = updater.AvatarUrl
                } : null,
                Entity = new ActivityEntityDto { Kind = "submission", Id = s.Id, FormId = s.FormId },
                Link = $"/admin/submissions/{s.Id}"
            });
        }

        // Created users
        var recentUsers = await db.Users
            .OrderByDescending(u => u.CreatedAt)
            .Take(limit)
            .ToListAsync();

        foreach (var u in recentUsers)
        {
            activities.Add(new AdminActivityDto
            {
                Id = $"user_created-{u.Id}",
                Type = "user_created",
                OccurredAt = u.CreatedAt,
                Title = "New user created",
                Summary = $"User {u.Email} joined",
                Actor = new ActivityActorDto { Id = u.Id, Email = u.Email, DisplayName = u.DisplayName, AvatarUrl = u.AvatarUrl },
                Entity = new ActivityEntityDto { Kind = "user", Id = u.Id },
                Link = $"/admin/users/{u.Id}"
            });
        }

        // Sent notifications
        var recentNotifications = await db.Notifications
            .Include(n => n.Creator)
            .OrderByDescending(n => n.CreatedAt)
            .Take(limit)
            .ToListAsync();

        foreach (var n in recentNotifications)
        {
            activities.Add(new AdminActivityDto
            {
                Id = $"notification_sent-{n.Id}",
                Type = "notification_sent",
                OccurredAt = n.CreatedAt,
                Title = $"Notification sent: \"{n.Title}\"",
                Summary = n.Creator != null ? $"Sent by {n.Creator.Email}" : "Notification sent",
                Actor = n.Creator != null ? new ActivityActorDto
                {
                    Id = n.Creator.Id,
                    Email = n.Creator.Email,
                    DisplayName = n.Creator.DisplayName,
                    AvatarUrl = n.Creator.AvatarUrl
                } : null,
                Entity = new ActivityEntityDto { Kind = "notification", Id = n.Id },
                Link = $"/admin/notifications"
            });
        }

        var items = activities
            .OrderByDescending(a => a.OccurredAt)
            .Take(limit)
            .ToList();

        return Ok(new { items });
    }

    [HttpGet("submissions")]
    public async Task<IActionResult> ListSubmissions(
        [FromQuery] int limit = 25,
        [FromQuery] int offset = 0,
        [FromQuery] int? form_id = null,
        [FromQuery] string? q = null,
        [FromQuery] string? from = null,
        [FromQuery] string? to = null)
    {
        try { HttpContext.RequireRole(UserRole.Admin); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        limit = Math.Clamp(limit, 1, 200);
        if (offset < 0) offset = 0;

        var query = db.FormSubmissions
            .Include(s => s.Form)
            .Include(s => s.User)
            .AsQueryable();

        if (form_id.HasValue)
            query = query.Where(s => s.FormId == form_id.Value);

        if (!string.IsNullOrWhiteSpace(q))
        {
            if (int.TryParse(q, out var subId))
                query = query.Where(s => s.Id == subId || (s.User != null && s.User.Email.Contains(q)));
            else
                query = query.Where(s => s.User != null && s.User.Email.Contains(q));
        }

        if (!string.IsNullOrWhiteSpace(from) && DateOnly.TryParse(from, out var fromDate))
        {
            var fromDt = fromDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            query = query.Where(s => s.SubmittedAt >= fromDt);
        }

        if (!string.IsNullOrWhiteSpace(to) && DateOnly.TryParse(to, out var toDate))
        {
            var toDt = toDate.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc);
            query = query.Where(s => s.SubmittedAt <= toDt);
        }

        var total = await query.CountAsync();

        var submissions = await query
            .OrderByDescending(s => s.SubmittedAt)
            .Skip(offset)
            .Take(limit)
            .ToListAsync();

        var items = submissions.Select(s =>
        {
            var abnormalities = AbnormalitiesService.Compute(s.Form.Json, s.Data);
            return new AdminSubmissionListItemDto
            {
                Id = s.Id,
                FormId = s.FormId,
                FormName = s.Form.Name,
                UserId = s.UserId,
                UserEmail = s.User?.Email,
                SubmittedAt = s.SubmittedAt,
                HasAbnormalities = abnormalities.Count > 0,
                AbnormalCount = abnormalities.Count
            };
        }).ToList();

        return Ok(new { items, total, limit, offset });
    }

    [HttpGet("submissions/{id:int}")]
    public async Task<IActionResult> GetSubmission(int id)
    {
        try { HttpContext.RequireRole(UserRole.Admin); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        var submission = await db.FormSubmissions
            .Include(s => s.Form)
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (submission == null)
            return NotFound(new { error = "Submission not found." });

        return Ok(await BuildAdminSubmissionDetailDto(submission));
    }

    [HttpPut("submissions/{id:int}")]
    public async Task<IActionResult> UpdateSubmission(int id, [FromBody] UpdateSubmissionRequest body)
    {
        User currentUser;
        try { currentUser = HttpContext.RequireRole(UserRole.Admin); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        var submission = await db.FormSubmissions
            .Include(s => s.Form)
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (submission == null)
            return NotFound(new { error = "Submission not found." });

        if (body.Data.HasValue && body.Data.Value.ValueKind != JsonValueKind.Undefined)
        {
            // Append to edit history
            var historyEntry = new
            {
                editedBy = currentUser.Id,
                editedAt = DateTime.UtcNow.ToString("O"),
                previousData = submission.Data
            };

            List<object> history;
            if (!string.IsNullOrEmpty(submission.EditHistory))
            {
                try
                {
                    history = JsonSerializer.Deserialize<List<object>>(submission.EditHistory) ?? [];
                }
                catch { history = []; }
            }
            else
            {
                history = [];
            }

            history.Add(historyEntry);
            submission.EditHistory = JsonSerializer.Serialize(history);
            submission.Data = body.Data.Value.GetRawText();
            submission.UpdatedAt = DateTime.UtcNow;
            submission.UpdatedBy = currentUser.Id;

            await db.SaveChangesAsync();
        }

        return Ok(await BuildAdminSubmissionDetailDto(submission));
    }

    [HttpPost("pdf")]
    public async Task<IActionResult> ExportPdf([FromBody] PdfExportRequest body)
    {
        try { HttpContext.RequireRole(UserRole.Admin); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        if (string.IsNullOrWhiteSpace(body.Html))
            return BadRequest(new { error = "HTML is required." });

        const int maxBytes = 5 * 1024 * 1024;
        if (System.Text.Encoding.UTF8.GetByteCount(body.Html) > maxBytes)
            return StatusCode(413, new { error = "Payload too large. Maximum 5MB." });

        byte[] pdfBytes;
        try { pdfBytes = await pdfService.GeneratePdfAsync(body.Html); }
        catch (Exception ex) { return StatusCode(500, new { error = $"PDF generation failed: {ex.Message}" }); }

        var fileName = string.IsNullOrWhiteSpace(body.FileName)
            ? "export.pdf"
            : body.FileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase)
                ? body.FileName
                : $"{body.FileName}.pdf";

        Response.Headers.Append("Content-Disposition", $"attachment; filename=\"{fileName}\"");
        return File(pdfBytes, "application/pdf");
    }

    [HttpGet("notifications")]
    public async Task<IActionResult> ListNotifications(
        [FromQuery] int limit = 25,
        [FromQuery] int offset = 0)
    {
        try { HttpContext.RequireRole(UserRole.Admin); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        limit = Math.Clamp(limit, 1, 200);
        if (offset < 0) offset = 0;

        var notifications = await db.Notifications
            .Include(n => n.Creator)
            .Include(n => n.Recipients)
            .OrderByDescending(n => n.CreatedAt)
            .Skip(offset)
            .Take(limit)
            .ToListAsync();

        var items = notifications.Select(n => new AdminNotificationDto
        {
            Id = n.Id,
            Title = n.Title,
            Body = n.Body,
            Level = n.Level,
            CreatedAt = n.CreatedAt,
            CreatedBy = n.CreatedBy,
            CreatedByEmail = n.Creator?.Email,
            CreatedByAvatarUrl = n.Creator?.AvatarUrl,
            RecipientCount = n.Recipients.Count,
            ReadCount = n.Recipients.Count(r => r.ReadAt != null)
        }).ToList();

        return Ok(new { items, limit, offset });
    }

    [HttpPost("notifications")]
    public async Task<IActionResult> SendNotification([FromBody] CreateNotificationRequest body)
    {
        User currentUser;
        try { currentUser = HttpContext.RequireRole(UserRole.Admin); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        if (string.IsNullOrWhiteSpace(body.Title))
            return BadRequest(new { error = "Title is required." });
        if (string.IsNullOrWhiteSpace(body.Body))
            return BadRequest(new { error = "Body is required." });

        // Resolve recipients
        List<User> recipients = [];

        if (body.AllUsers == true)
        {
            recipients = await db.Users.Where(u => u.IsActive).ToListAsync();
        }
        else
        {
            if (body.Roles?.Count > 0)
            {
                var byRole = await db.Users.Where(u => u.IsActive && body.Roles.Contains(u.Role)).ToListAsync();
                recipients.AddRange(byRole);
            }

            if (body.UserIds?.Count > 0)
            {
                var byId = await db.Users.Where(u => body.UserIds.Contains(u.Id)).ToListAsync();
                foreach (var u in byId)
                {
                    if (!recipients.Any(r => r.Id == u.Id))
                        recipients.Add(u);
                }
            }
        }

        if (recipients.Count == 0)
            return BadRequest(new { error = "No recipients found." });

        var notification = new Notification
        {
            Title = body.Title,
            Body = body.Body,
            Level = body.Level ?? "normal",
            CreatedBy = currentUser.Id,
            CreatedAt = DateTime.UtcNow
        };

        db.Notifications.Add(notification);
        await db.SaveChangesAsync();

        var now = DateTime.UtcNow;
        foreach (var recipient in recipients)
        {
            db.NotificationRecipients.Add(new NotificationRecipient
            {
                NotificationId = notification.Id,
                UserId = recipient.Id,
                DeliveredAt = now
            });
        }

        await db.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            notification_id = notification.Id,
            recipient_count = recipients.Count
        });
    }

    [HttpGet("settings/site")]
    public async Task<IActionResult> GetSiteSettings()
    {
        var settings = await db.SiteSettings.ToListAsync();
        return Ok(BuildSiteSettingsDto(settings));
    }

    [HttpPut("settings/site")]
    public async Task<IActionResult> UpdateSiteSettings([FromBody] UpdateSiteSettingsRequest body)
    {
        try { HttpContext.RequireRole(UserRole.Admin); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        var updates = new Dictionary<string, string?>();
        if (body.SiteName != null) updates["siteName"] = body.SiteName;
        if (body.FaviconUrl != null) updates["faviconUrl"] = body.FaviconUrl;
        if (body.LogoExpandedLightUrl != null) updates["logoExpandedLightUrl"] = body.LogoExpandedLightUrl;
        if (body.LogoExpandedDarkUrl != null) updates["logoExpandedDarkUrl"] = body.LogoExpandedDarkUrl;
        if (body.LogoCollapsedUrl != null) updates["logoCollapsedUrl"] = body.LogoCollapsedUrl;
        if (body.LogoExpandedWidth != null) updates["logoExpandedWidth"] = body.LogoExpandedWidth;
        if (body.LogoExpandedHeight != null) updates["logoExpandedHeight"] = body.LogoExpandedHeight;
        if (body.LogoCollapsedSize != null) updates["logoCollapsedSize"] = body.LogoCollapsedSize;

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

    [HttpGet("settings/integrations")]
    public async Task<IActionResult> GetIntegrations()
    {
        try { HttpContext.RequireRole(UserRole.Admin); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        var settings = await db.SiteSettings.ToListAsync();
        return Ok(BuildIntegrationsDto(settings));
    }

    [HttpPut("settings/integrations")]
    public async Task<IActionResult> UpdateIntegrations([FromBody] UpdateIntegrationsRequest body)
    {
        try { HttpContext.RequireRole(UserRole.Admin); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        var updates = new Dictionary<string, string?>();

        if (body.Email != null)
        {
            if (body.Email.Enabled != null) updates["integration.email.enabled"] = body.Email.Enabled;
            if (body.Email.Provider != null) updates["integration.email.provider"] = body.Email.Provider;
            if (body.Email.SmtpHost != null) updates["integration.email.smtpHost"] = body.Email.SmtpHost;
            if (body.Email.SmtpPort != null) updates["integration.email.smtpPort"] = body.Email.SmtpPort;
            if (body.Email.SmtpUsername != null) updates["integration.email.smtpUsername"] = body.Email.SmtpUsername;
            if (body.Email.SmtpPassword != null) updates["integration.email.smtpPassword"] = body.Email.SmtpPassword;
            if (body.Email.SmtpTls != null) updates["integration.email.smtpTls"] = body.Email.SmtpTls;
            if (body.Email.SendgridApiKey != null) updates["integration.email.sendgridApiKey"] = body.Email.SendgridApiKey;
            if (body.Email.FromEmail != null) updates["integration.email.fromEmail"] = body.Email.FromEmail;
            if (body.Email.FromName != null) updates["integration.email.fromName"] = body.Email.FromName;
        }

        if (body.Mex != null)
        {
            if (body.Mex.Enabled != null) updates["integration.mex.enabled"] = body.Mex.Enabled;
            if (body.Mex.BaseUrl != null) updates["integration.mex.baseUrl"] = body.Mex.BaseUrl;
            if (body.Mex.ApiKey != null) updates["integration.mex.apiKey"] = body.Mex.ApiKey;
        }

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
        return Ok(BuildIntegrationsDto(allSettings));
    }

    private static IntegrationsDto BuildIntegrationsDto(List<SiteSetting> settings)
    {
        var dict = settings.ToDictionary(s => s.Key, s => s.Value);
        return new IntegrationsDto
        {
            Email = new EmailIntegrationDto
            {
                Enabled = dict.GetValueOrDefault("integration.email.enabled") == "true",
                Provider = dict.GetValueOrDefault("integration.email.provider") ?? "smtp",
                SmtpHost = dict.GetValueOrDefault("integration.email.smtpHost"),
                SmtpPort = dict.GetValueOrDefault("integration.email.smtpPort"),
                SmtpUsername = dict.GetValueOrDefault("integration.email.smtpUsername"),
                SmtpPasswordSet = !string.IsNullOrEmpty(dict.GetValueOrDefault("integration.email.smtpPassword")),
                SmtpTls = dict.GetValueOrDefault("integration.email.smtpTls") != "false",
                SendgridApiKeySet = !string.IsNullOrEmpty(dict.GetValueOrDefault("integration.email.sendgridApiKey")),
                FromEmail = dict.GetValueOrDefault("integration.email.fromEmail"),
                FromName = dict.GetValueOrDefault("integration.email.fromName"),
            },
            Mex = new MexIntegrationDto
            {
                Enabled = dict.GetValueOrDefault("integration.mex.enabled") == "true",
                BaseUrl = dict.GetValueOrDefault("integration.mex.baseUrl"),
                ApiKeySet = !string.IsNullOrEmpty(dict.GetValueOrDefault("integration.mex.apiKey")),
            }
        };
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

    private async Task<AdminSubmissionDetailDto> BuildAdminSubmissionDetailDto(FormSubmission submission)
    {
        User? updatedByUser = null;
        if (submission.UpdatedBy.HasValue)
            updatedByUser = await db.Users.FindAsync(submission.UpdatedBy.Value);

        object? formObj = null;
        try { formObj = JsonDocument.Parse(submission.Form.Json).RootElement; } catch { }

        object? dataObj = null;
        try { dataObj = JsonDocument.Parse(submission.Data).RootElement; } catch { }

        object? editHistoryObj = null;
        if (!string.IsNullOrEmpty(submission.EditHistory))
        {
            try { editHistoryObj = JsonDocument.Parse(submission.EditHistory).RootElement; } catch { }
        }

        var abnormalities = AbnormalitiesService.Compute(submission.Form.Json, submission.Data);
        var abnormalityObjects = abnormalities
            .Select(a => (object)new { key = a.Key, type = a.Type, label = a.Label, normalValue = a.NormalValue })
            .ToList();

        return new AdminSubmissionDetailDto
        {
            Id = submission.Id,
            FormId = submission.FormId,
            FormName = submission.Form.Name,
            UserId = submission.UserId,
            UserEmail = submission.User?.Email,
            SubmittedAt = submission.SubmittedAt,
            UpdatedAt = submission.UpdatedAt,
            UpdatedBy = submission.UpdatedBy,
            UpdatedByEmail = updatedByUser?.Email,
            EditHistory = editHistoryObj,
            Form = formObj,
            Data = dataObj,
            HasAbnormalities = abnormalities.Count > 0,
            Abnormalities = abnormalityObjects
        };
    }
}
