using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HPA.SurveyFlow.Api.Authorization;
using HPA.SurveyFlow.Domain.DTOs.Responses;
using HPA.SurveyFlow.Domain.Entities;
using HPA.SurveyFlow.Domain.Security;
using HPA.SurveyFlow.Infrastructure.Data;

namespace HPA.SurveyFlow.Api.Controllers;

[ApiController]
[Route("api/dashboard")]
public class DashboardController(AppDbContext db) : ControllerBase
{
    [RequirePermission(Permissions.Admin.ViewDashboard)]
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var totalForms = await db.Forms.CountAsync();
        var totalSubmissions = await db.FormSubmissions.CountAsync(s => s.DeletedAt == null);
        var submittedForms = await db.FormSubmissions.Where(s => s.DeletedAt == null).Select(s => s.FormId).Distinct().CountAsync();
        var today = DateTime.UtcNow.Date;
        var submissionsToday = await db.FormSubmissions.CountAsync(s => s.DeletedAt == null && s.SubmittedAt >= today);
        var last7Days = DateTime.UtcNow.AddDays(-7);
        var submissionsLast7Days = await db.FormSubmissions.CountAsync(s => s.DeletedAt == null && s.SubmittedAt >= last7Days);

        return Ok(new
        {
            totalForms,
            totalSubmissions,
            submittedForms,
            submissionsToday,
            submissionsLast7Days
        });
    }

    [RequirePermission(Permissions.Admin.ViewDashboard)]
    [HttpGet("activity")]
    public async Task<IActionResult> GetActivity([FromQuery] int limit = 10)
    {
        limit = Math.Clamp(limit, 1, 50);

        var activities = new List<AdminActivityDto>();

        var recentSubmissions = await db.FormSubmissions
            .Include(s => s.Form)
            .Include(s => s.User)
            .Where(s => s.DeletedAt == null)
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

        var updatedSubmissions = await db.FormSubmissions
            .Include(s => s.Form)
            .Where(s => s.DeletedAt == null && s.UpdatedAt != null)
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

        var items = activities
            .OrderByDescending(a => a.OccurredAt)
            .Take(limit)
            .ToList();

        return Ok(new { items });
    }
}
