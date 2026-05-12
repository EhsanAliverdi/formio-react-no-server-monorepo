using Microsoft.EntityFrameworkCore;
using HPA.SurveyFlow.Domain.Enums;
using HPA.SurveyFlow.Infrastructure.Data;

namespace HPA.SurveyFlow.Infrastructure.Services;

public class FormAccessService(AppDbContext db)
{
    public async Task<bool> CanUserAccessFormAsync(int formId, int? userId, string? role)
    {
        var form = await db.Forms
            .Include(f => f.AllowedRoles)
            .Include(f => f.AllowedUsers)
            .FirstOrDefaultAsync(f => f.Id == formId);

        if (form == null) return false;

        // Admins and editors see all forms
        if (role == UserRole.Admin || role == UserRole.Editor) return true;

        if (form.Visibility == FormVisibility.Public) return true;

        // Restricted: check role-based access
        if (role != null && form.AllowedRoles.Any(ar => ar.Role == role)) return true;

        // Restricted: check user-specific access
        if (userId.HasValue && form.AllowedUsers.Any(au => au.UserId == userId.Value)) return true;

        return false;
    }

    public async Task<IEnumerable<Domain.Entities.Form>> ListAccessibleFormsAsync(int? userId, string? role)
    {
        var query = db.Forms.AsQueryable();

        // Admins/editors see all
        if (role == UserRole.Admin || role == UserRole.Editor)
            return await query.ToListAsync();

        // Public forms + forms the user has specific access to
        return await db.Forms
            .Include(f => f.AllowedRoles)
            .Include(f => f.AllowedUsers)
            .Where(f =>
                f.Visibility == FormVisibility.Public ||
                (role != null && f.AllowedRoles.Any(ar => ar.Role == role)) ||
                (userId.HasValue && f.AllowedUsers.Any(au => au.UserId == userId.Value)))
            .ToListAsync();
    }
}
