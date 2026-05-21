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
        if (!isPrivileged)
            forms = forms.Where(f => f.ParentFormId == null);

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
        if (body.ParentFormId.HasValue && !await db.Forms.AnyAsync(f => f.Id == body.ParentFormId.Value))
            return BadRequest(new { error = "Parent form does not exist." });

        var form = new Form
        {
            Name = body.Name,
            Json = body.Json.Value.GetRawText(),
            AllowAnonymousSubmit = allowAnon,
            Visibility = body.Visibility ?? FormVisibility.Public,
            ParentFormId = body.ParentFormId
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
        if (body.ParentFormId.HasValue && body.ParentFormId.Value == id)
            return BadRequest(new { error = "A form cannot be its own parent." });
        if (body.ParentFormId.HasValue && !await db.Forms.AnyAsync(f => f.Id == body.ParentFormId.Value))
            return BadRequest(new { error = "Parent form does not exist." });
        form.ParentFormId = body.ParentFormId;
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
        if (body.ParentSubmissionId.HasValue)
        {
            var parentSubmission = await db.FormSubmissions
                .Include(s => s.Form)
                .FirstOrDefaultAsync(s => s.Id == body.ParentSubmissionId.Value);
            if (parentSubmission == null)
                return BadRequest(new { error = "Parent submission does not exist." });
            if (form.ParentFormId.HasValue && form.ParentFormId.Value != parentSubmission.FormId)
                return BadRequest(new { error = "This form is not configured as a child of the parent submission's form." });
        }

        var submission = new FormSubmission
        {
            FormId = form.Id,
            ParentSubmissionId = body.ParentSubmissionId,
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
        var outcome = errorCount > 0 ? "error" : warningCount > 0 ? "warning" : "success";

        try
        {
            var formSchema = JsonDocument.Parse(form.Json).RootElement;
            if (TryGetSecondarySubmitAction(formSchema, outcome, out var integration, out var action))
            {
                secondarySubmitService.DispatchAsync(integration, action, dataJson, submission.Id, outcome);
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
            warning_count = warningCount,
            outcome,
            abnormalities = abnormalities.Select(a => new
            {
                key = a.Key,
                label = a.Label,
                level = a.Level,
                normal_value = a.NormalValue,
                actual_value = a.ActualValue
            }),
            next_form_id = TryGetNextFormId(form.Json, outcome, out var nextFormId) ? nextFormId : (int?)null
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
            ParentFormId = f.ParentFormId,
            AllowedRoles = includeRestricted ? f.AllowedRoles.Select(r => r.Role).ToList() : null,
            AllowedUserIds = includeRestricted ? f.AllowedUsers.Select(u => u.UserId).ToList() : null
        };
    }

    internal static bool TryGetNextFormId(string formJson, string outcome, out int nextFormId)
    {
        nextFormId = 0;
        try
        {
            var schema = JsonDocument.Parse(formJson).RootElement;
            if (!schema.TryGetProperty("appSettings", out var appSettingsEl)
                || !appSettingsEl.TryGetProperty("nextForms", out var nextFormsEl)
                || !nextFormsEl.TryGetProperty(outcome, out var outcomeEl))
                return false;

            if (outcomeEl.ValueKind == JsonValueKind.Number)
                return outcomeEl.TryGetInt32(out nextFormId) && nextFormId > 0;

            if (outcomeEl.ValueKind == JsonValueKind.String
                && int.TryParse(outcomeEl.GetString(), out nextFormId))
                return nextFormId > 0;
        }
        catch { }

        return false;
    }

    internal static bool TryGetSecondarySubmitAction(JsonElement formSchema, string outcome, out string integration, out string action)
    {
        integration = "";
        action = "";

        if (!formSchema.TryGetProperty("appSettings", out var appSettingsEl)
            || !appSettingsEl.TryGetProperty("secondarySubmit", out var secEl))
            return false;

        if (secEl.TryGetProperty(outcome, out var outcomeEl))
            return TryReadSecondarySubmitAction(outcomeEl, out integration, out action);

        // Backward compatibility for forms saved before outcome-specific secondary submit.
        return TryReadSecondarySubmitAction(secEl, out integration, out action);
    }

    private static bool TryReadSecondarySubmitAction(JsonElement configEl, out string integration, out string action)
    {
        integration = "";
        action = "";

        if (!configEl.TryGetProperty("enabled", out var enabledEl) || enabledEl.ValueKind != JsonValueKind.True)
            return false;

        integration = configEl.TryGetProperty("integration", out var intEl) ? intEl.GetString() ?? "" : "";
        action = configEl.TryGetProperty("action", out var actEl) ? actEl.GetString() ?? "" : "";

        return !string.IsNullOrWhiteSpace(integration) && !string.IsNullOrWhiteSpace(action);
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
