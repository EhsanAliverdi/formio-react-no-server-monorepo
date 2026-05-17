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
[Route("api/forms")]
public class FormsController(AppDbContext db, FormAccessService formAccessService, SecondarySubmitService secondarySubmitService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> ListForms([FromQuery] string? mode)
    {
        var currentUser = HttpContext.GetCurrentUser();
        var role = currentUser?.Role;
        var userId = currentUser?.Id;

        IEnumerable<Form> forms;
        if (role == UserRole.Admin || role == UserRole.Editor)
        {
            forms = await db.Forms
                .Include(f => f.AllowedRoles)
                .Include(f => f.AllowedUsers)
                .ToListAsync();
        }
        else
        {
            forms = await formAccessService.ListAccessibleFormsAsync(userId, role);
        }

        var isPrivileged = role == UserRole.Admin || role == UserRole.Editor;
        var result = forms.Select(f => MapFormDto(f, isPrivileged)).ToList();
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> CreateForm([FromBody] CreateFormRequest body)
    {
        User currentUser;
        try { currentUser = HttpContext.RequireRole(UserRole.Admin, UserRole.Editor); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        if (string.IsNullOrWhiteSpace(body.Name))
            return BadRequest(new { error = "Name is required." });
        if (body.Json == null || body.Json.Value.ValueKind == JsonValueKind.Undefined)
            return BadRequest(new { error = "JSON is required." });

        if (currentUser.Role != UserRole.Admin && body.AllowedUserIds?.Count > 0)
            return StatusCode(403, new { error = "Only admins can set allowed_user_ids." });

        var allowAnon = ParseBoolish(body.AllowAnonymousSubmit, defaultValue: true);

        var form = new Form
        {
            Name = body.Name,
            Json = body.Json.Value.GetRawText(),
            AllowAnonymousSubmit = allowAnon,
            Visibility = body.Visibility ?? FormVisibility.Public
        };

        db.Forms.Add(form);
        await db.SaveChangesAsync();

        if (body.AllowedRoles?.Count > 0)
        {
            foreach (var r in body.AllowedRoles)
                db.FormAllowedRoles.Add(new FormAllowedRole { FormId = form.Id, Role = r });
        }

        if (currentUser.Role == UserRole.Admin && body.AllowedUserIds?.Count > 0)
        {
            foreach (var uid in body.AllowedUserIds)
                db.FormAllowedUsers.Add(new FormAllowedUser { FormId = form.Id, UserId = uid });
        }

        await db.SaveChangesAsync();
        return Ok(new { success = true, id = form.Id });
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetForm(int id)
    {
        var currentUser = HttpContext.GetCurrentUser();
        var role = currentUser?.Role;
        var userId = currentUser?.Id;

        var form = await db.Forms
            .Include(f => f.AllowedRoles)
            .Include(f => f.AllowedUsers)
            .FirstOrDefaultAsync(f => f.Id == id);

        if (form == null)
            return NotFound(new { error = "Form not found." });

        var canAccess = await formAccessService.CanUserAccessFormAsync(id, userId, role);
        if (!canAccess)
            return StatusCode(403, new { error = "Access denied." });

        var isPrivileged = role == UserRole.Admin || role == UserRole.Editor;
        return Ok(MapFormDto(form, isPrivileged));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateForm(int id, [FromBody] UpdateFormRequest body)
    {
        User currentUser;
        try { currentUser = HttpContext.RequireRole(UserRole.Admin, UserRole.Editor); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        var form = await db.Forms
            .Include(f => f.AllowedRoles)
            .Include(f => f.AllowedUsers)
            .FirstOrDefaultAsync(f => f.Id == id);

        if (form == null)
            return NotFound(new { error = "Form not found." });

        if (currentUser.Role != UserRole.Admin && body.AllowedUserIds?.Count > 0)
            return StatusCode(403, new { error = "Only admins can set allowed_user_ids." });

        if (body.Name != null) form.Name = body.Name;
        if (body.Json != null && body.Json.Value.ValueKind != JsonValueKind.Undefined)
            form.Json = body.Json.Value.GetRawText();
        if (body.Visibility != null) form.Visibility = body.Visibility;
        if (body.AllowAnonymousSubmit != null)
            form.AllowAnonymousSubmit = ParseBoolish(body.AllowAnonymousSubmit, form.AllowAnonymousSubmit);

        // Sync allowed roles
        if (body.AllowedRoles != null)
        {
            db.FormAllowedRoles.RemoveRange(form.AllowedRoles);
            foreach (var r in body.AllowedRoles)
                db.FormAllowedRoles.Add(new FormAllowedRole { FormId = form.Id, Role = r });
        }

        // Sync allowed users (admin only)
        if (currentUser.Role == UserRole.Admin && body.AllowedUserIds != null)
        {
            db.FormAllowedUsers.RemoveRange(form.AllowedUsers);
            foreach (var uid in body.AllowedUserIds)
                db.FormAllowedUsers.Add(new FormAllowedUser { FormId = form.Id, UserId = uid });
        }

        await db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteForm(int id)
    {
        try { HttpContext.RequireRole(UserRole.Admin, UserRole.Editor); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        var form = await db.Forms.FindAsync(id);
        if (form == null)
            return NotFound(new { error = "Form not found." });

        db.Forms.Remove(form);
        await db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpPost("{id:int}/submit")]
    public async Task<IActionResult> SubmitForm(int id, [FromBody] SubmitFormRequest body)
    {
        var currentUser = HttpContext.GetCurrentUser();

        var form = await db.Forms
            .Include(f => f.AllowedRoles)
            .Include(f => f.AllowedUsers)
            .FirstOrDefaultAsync(f => f.Id == id);

        if (form == null)
            return NotFound(new { error = "Form not found." });

        // If form doesn't allow anonymous and user is not authenticated
        if (!form.AllowAnonymousSubmit && currentUser == null)
            return Unauthorized(new { error = "Authentication required to submit this form." });

        // If form is restricted and user can't access
        if (form.Visibility == FormVisibility.Restricted)
        {
            var canAccess = await formAccessService.CanUserAccessFormAsync(id, currentUser?.Id, currentUser?.Role);
            if (!canAccess)
                return StatusCode(403, new { error = "Access denied." });
        }

        var dataJson = body.Data?.GetRawText() ?? "{}";

        var submission = new FormSubmission
        {
            FormId = form.Id,
            UserId = currentUser?.Id,
            Data = dataJson,
            SubmittedAt = DateTime.UtcNow
        };

        db.FormSubmissions.Add(submission);
        await db.SaveChangesAsync();

        var abnormalities = AbnormalitiesService.Compute(form.Json, dataJson);
        var errorCount = abnormalities.Count(a => a.Level == "error");
        var warningCount = abnormalities.Count(a => a.Level == "warning");

        // Dispatch secondary submit in background — does not block the response
        try
        {
            var formSchema = JsonDocument.Parse(form.Json).RootElement;
            if (formSchema.TryGetProperty("appSettings", out var appSettingsEl)
                && appSettingsEl.TryGetProperty("secondarySubmit", out var secEl)
                && secEl.TryGetProperty("enabled", out var enabledEl)
                && enabledEl.ValueKind == JsonValueKind.True)
            {
                var integration = secEl.TryGetProperty("integration", out var intEl) ? intEl.GetString() ?? "" : "";
                var action = secEl.TryGetProperty("action", out var actEl) ? actEl.GetString() ?? "" : "";
                if (!string.IsNullOrWhiteSpace(integration) && !string.IsNullOrWhiteSpace(action))
                    secondarySubmitService.DispatchAsync(integration, action, dataJson, submission.Id);
            }
        }
        catch { /* never fail primary submit */ }

        return Ok(new
        {
            success = true,
            id = submission.Id,
            has_errors = errorCount > 0,
            has_warnings = warningCount > 0,
            error_count = errorCount,
            warning_count = warningCount
        });
    }

    private static FormDto MapFormDto(Form f, bool includeRestricted)
    {
        object jsonObj;
        try { jsonObj = JsonDocument.Parse(f.Json).RootElement; }
        catch { jsonObj = f.Json; }

        return new FormDto
        {
            Id = f.Id,
            Name = f.Name,
            Json = jsonObj,
            AllowAnonymousSubmit = f.AllowAnonymousSubmit ? 1 : 0,
            Visibility = f.Visibility,
            AllowedRoles = includeRestricted ? f.AllowedRoles.Select(r => r.Role).ToList() : null,
            AllowedUserIds = includeRestricted ? f.AllowedUsers.Select(u => u.UserId).ToList() : null
        };
    }

    private static bool ParseBoolish(object? value, bool defaultValue = false)
    {
        return value switch
        {
            bool b => b,
            int i => i != 0,
            JsonElement el when el.ValueKind == JsonValueKind.True => true,
            JsonElement el when el.ValueKind == JsonValueKind.False => false,
            JsonElement el when el.ValueKind == JsonValueKind.Number => el.GetInt32() != 0,
            string s => s == "1" || s.Equals("true", StringComparison.OrdinalIgnoreCase),
            _ => defaultValue
        };
    }
}
