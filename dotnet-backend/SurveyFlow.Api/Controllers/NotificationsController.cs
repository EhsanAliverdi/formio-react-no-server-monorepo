using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SurveyFlow.Api.Extensions;
using SurveyFlow.Core.DTOs.Responses;
using SurveyFlow.Core.Enums;
using SurveyFlow.Infrastructure.Data;

namespace SurveyFlow.Api.Controllers;

[ApiController]
[Route("api/notifications")]
public class NotificationsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> ListNotifications(
        [FromQuery] string? unread,
        [FromQuery] int limit = 50,
        [FromQuery] int offset = 0)
    {
        try { HttpContext.RequireRole(UserRole.Admin, UserRole.Editor, UserRole.Viewer); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        var currentUser = HttpContext.GetCurrentUser()!;

        limit = Math.Clamp(limit, 1, 200);
        if (offset < 0) offset = 0;

        var query = db.NotificationRecipients
            .Include(nr => nr.Notification)
                .ThenInclude(n => n.Creator)
            .Where(nr => nr.UserId == currentUser.Id)
            .AsQueryable();

        if (unread == "1")
            query = query.Where(nr => nr.ReadAt == null);

        var unreadCount = await db.NotificationRecipients
            .CountAsync(nr => nr.UserId == currentUser.Id && nr.ReadAt == null);

        var recipients = await query
            .OrderByDescending(nr => nr.Notification.CreatedAt)
            .Skip(offset)
            .Take(limit)
            .ToListAsync();

        var items = recipients.Select(nr => new NotificationDto
        {
            Id = nr.NotificationId,
            Title = nr.Notification.Title,
            Body = nr.Notification.Body,
            Level = nr.Notification.Level,
            CreatedAt = nr.Notification.CreatedAt,
            CreatedBy = nr.Notification.CreatedBy,
            CreatedByEmail = nr.Notification.Creator?.Email,
            CreatedByAvatarUrl = nr.Notification.Creator?.AvatarUrl,
            DeliveredAt = nr.DeliveredAt,
            ReadAt = nr.ReadAt
        }).ToList();

        return Ok(new { items, unread_count = unreadCount, limit, offset });
    }

    [HttpPut("{id:int}/read")]
    public async Task<IActionResult> MarkAsRead(int id)
    {
        try { HttpContext.RequireRole(UserRole.Admin, UserRole.Editor, UserRole.Viewer); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        var currentUser = HttpContext.GetCurrentUser()!;

        var recipient = await db.NotificationRecipients
            .FirstOrDefaultAsync(nr => nr.NotificationId == id && nr.UserId == currentUser.Id);

        if (recipient == null)
            return NotFound(new { error = "Notification not found." });

        recipient.ReadAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Ok(new { success = true });
    }
}
