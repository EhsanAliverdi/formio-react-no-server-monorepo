using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HPA.SurveyFlow.Api.Authorization;
using HPA.SurveyFlow.Api.Extensions;
using HPA.SurveyFlow.Domain.DTOs.Requests;
using HPA.SurveyFlow.Domain.DTOs.Responses;
using HPA.SurveyFlow.Domain.Entities;
using HPA.SurveyFlow.Domain.Security;
using HPA.SurveyFlow.Infrastructure.Data;
using HPA.SurveyFlow.Infrastructure.Services;

namespace HPA.SurveyFlow.Api.Controllers;

[ApiController]
[Route("api/report-templates")]
[RequirePermission(Permissions.Reports.Read)]
public class ReportTemplatesController(
    AppDbContext db,
    FormSchemaResolverService schemaResolver,
    DriftAnalysisService driftAnalysis) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] int? formId,
        [FromQuery] string? category,
        [FromQuery] string? tag,
        [FromQuery] int? createdBy,
        [FromQuery] string? q,
        [FromQuery] bool favourite = false,
        [FromQuery] bool drift = false,
        [FromQuery] int limit = 25,
        [FromQuery] int offset = 0)
    {
        limit = Math.Clamp(limit, 1, 200);
        offset = Math.Max(0, offset);
        var user = HttpContext.GetCurrentUser();
        var isManager = user?.Role is "admin" or "editor";

        var query = db.ReportTemplates.Include(t => t.Form).AsQueryable();

        if (formId.HasValue)
            query = query.Where(t => t.FormId == formId.Value);

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(t => t.Category == category);

        if (!string.IsNullOrWhiteSpace(tag))
            query = query.Where(t => t.Tags != null && t.Tags.Contains(tag));

        if (createdBy.HasValue)
            query = query.Where(t => t.CreatedBy == createdBy.Value);

        if (!string.IsNullOrWhiteSpace(q))
        {
            var search = q.Trim().ToLower();
            query = query.Where(t =>
                t.Name.ToLower().Contains(search) ||
                (t.Description != null && t.Description.ToLower().Contains(search)) ||
                (t.Tags != null && t.Tags.ToLower().Contains(search)) ||
                t.Form.Name.ToLower().Contains(search));
        }

        // Viewers see public templates + templates shared with their role
        if (!isManager)
        {
            var role = user?.Role ?? "";
            query = query.Where(t =>
                t.IsPublic ||
                (t.SharedWithRolesJson != null && t.SharedWithRolesJson.Contains(role)));
        }

        // Load user's favourites once so we can flag each template
        var favouriteIds = user != null
            ? (await db.UserFavouriteReports.Where(f => f.UserId == user.Id).Select(f => f.ReportTemplateId).ToListAsync()).ToHashSet()
            : new HashSet<int>();

        if (favourite)
            query = query.Where(t => favouriteIds.Contains(t.Id));

        var ordered = await query.OrderByDescending(t => t.UpdatedAt).ToListAsync();
        var mapped = ordered.Select(t => MapDto(t, includeDrift: false, favouriteIds)).ToList();
        if (drift) mapped = mapped.Where(t => t.HasSchemaDrift).ToList();

        var total = mapped.Count;
        var items = mapped.Skip(offset).Take(limit).ToList();

        return Ok(new { items, total, limit, offset });
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id)
    {
        var user = HttpContext.GetCurrentUser();
        var isManager = user?.Role is "admin" or "editor";

        var template = await db.ReportTemplates
            .Include(t => t.Form)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (template == null) return NotFound(new { error = "Report template not found." });

        var role = user?.Role ?? "";
        var canAccess = isManager || template.IsPublic
            || (template.SharedWithRolesJson != null && template.SharedWithRolesJson.Contains(role));
        if (!canAccess) return Forbid();

        var isFav = user != null && await db.UserFavouriteReports.AnyAsync(f => f.UserId == user.Id && f.ReportTemplateId == id);
        return Ok(MapDto(template, includeDrift: true, isFav ? new HashSet<int> { id } : null));
    }

    [HttpGet("form-fields/{formId:int}")]
    public async Task<IActionResult> GetFormFields(int formId)
    {
        var form = await db.Forms.FindAsync(formId);
        if (form == null) return NotFound(new { error = "Form not found." });
        return Ok(schemaResolver.ResolveFields(form.Json));
    }

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
    {
        var categories = await db.ReportTemplates
            .Where(t => t.Category != null)
            .Select(t => t.Category!)
            .Distinct()
            .OrderBy(c => c)
            .ToListAsync();
        return Ok(categories);
    }

    [HttpPost]
    [RequirePermission(Permissions.Reports.Manage)]
    public async Task<IActionResult> Create([FromBody] SaveReportTemplateRequest body)
    {
        var user = HttpContext.GetCurrentUser();
        if (user == null) return Unauthorized();

        var form = await db.Forms.FindAsync(body.FormId);
        if (form == null) return NotFound(new { error = "Form not found." });

        var fields = schemaResolver.ResolveFields(form.Json);
        var schemaVersion = DriftAnalysisService.ComputeFieldsHash(fields);

        var template = new ReportTemplate
        {
            FormId = body.FormId,
            Name = body.Name,
            Description = body.Description,
            IsPublic = body.IsPublic,
            CreatedBy = user.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            ColumnsJson = JsonSerializer.Serialize(body.Columns),
            FiltersJson = body.Filters.HasValue ? body.Filters.Value.GetRawText() : null,
            DefaultSortField = body.DefaultSortField,
            DefaultSortDirection = body.DefaultSortDirection,
            DefaultPageSize = Math.Clamp(body.DefaultPageSize, 1, 200),
            DisplayMode = body.DisplayMode,
            SchemaVersion = schemaVersion,
            Tags = body.Tags.Count > 0 ? string.Join(",", body.Tags) : null,
            Category = body.Category,
            SharedWithRolesJson = body.SharedWithRoles.Count > 0
                ? JsonSerializer.Serialize(body.SharedWithRoles) : null,
            FieldDriftJson = null,
            GroupByJson = body.GroupBy.HasValue ? body.GroupBy.Value.GetRawText() : null,
            MeasuresJson = body.Measures.HasValue ? body.Measures.Value.GetRawText() : null,
            ChartType = body.ChartType,
            ChartConfigJson = body.ChartConfig.HasValue ? body.ChartConfig.Value.GetRawText() : null,
            DatasetId = body.DatasetId,
        };

        db.ReportTemplates.Add(template);
        await db.SaveChangesAsync();
        template.Form = form;
        return CreatedAtAction(nameof(Get), new { id = template.Id }, MapDto(template, includeDrift: false));
    }

    [HttpPut("{id:int}")]
    [RequirePermission(Permissions.Reports.Manage)]
    public async Task<IActionResult> Update(int id, [FromBody] SaveReportTemplateRequest body)
    {
        var template = await db.ReportTemplates.Include(t => t.Form).FirstOrDefaultAsync(t => t.Id == id);
        if (template == null) return NotFound(new { error = "Report template not found." });

        var form = template.Form;
        if (form.Id != body.FormId)
        {
            form = await db.Forms.FindAsync(body.FormId);
            if (form == null) return NotFound(new { error = "Form not found." });
        }

        var fields = schemaResolver.ResolveFields(form.Json);
        var schemaVersion = DriftAnalysisService.ComputeFieldsHash(fields);

        template.FormId = body.FormId;
        template.Name = body.Name;
        template.Description = body.Description;
        template.IsPublic = body.IsPublic;
        template.UpdatedAt = DateTime.UtcNow;
        template.ColumnsJson = JsonSerializer.Serialize(body.Columns);
        template.FiltersJson = body.Filters.HasValue ? body.Filters.Value.GetRawText() : null;
        template.DefaultSortField = body.DefaultSortField;
        template.DefaultSortDirection = body.DefaultSortDirection;
        template.DefaultPageSize = Math.Clamp(body.DefaultPageSize, 1, 200);
        template.DisplayMode = body.DisplayMode;
        template.SchemaVersion = schemaVersion;
        template.FieldDriftJson = null; // drift cleared on save
        template.Tags = body.Tags.Count > 0 ? string.Join(",", body.Tags) : null;
        template.Category = body.Category;
        template.SharedWithRolesJson = body.SharedWithRoles.Count > 0
            ? JsonSerializer.Serialize(body.SharedWithRoles) : null;
        template.GroupByJson = body.GroupBy.HasValue ? body.GroupBy.Value.GetRawText() : null;
        template.MeasuresJson = body.Measures.HasValue ? body.Measures.Value.GetRawText() : null;
        template.ChartType = body.ChartType;
        template.ChartConfigJson = body.ChartConfig.HasValue ? body.ChartConfig.Value.GetRawText() : null;
        template.DatasetId = body.DatasetId;

        await db.SaveChangesAsync();
        template.Form = form;
        return Ok(MapDto(template, includeDrift: false));
    }

    [HttpDelete("{id:int}")]
    [RequirePermission(Permissions.Reports.Manage)]
    public async Task<IActionResult> Delete(int id)
    {
        var template = await db.ReportTemplates.FindAsync(id);
        if (template == null) return NotFound(new { error = "Report template not found." });
        db.ReportTemplates.Remove(template);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private ReportTemplateDto MapDto(ReportTemplate t, bool includeDrift, HashSet<int>? favouriteIds = null)
    {
        List<ReportColumnDefinitionDto> columns;
        try
        {
            columns = JsonSerializer.Deserialize<List<ReportColumnDefinitionDto>>(
                t.ColumnsJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? [];
        }
        catch { columns = []; }

        JsonElement? filters = null;
        if (!string.IsNullOrWhiteSpace(t.FiltersJson))
            try { filters = JsonDocument.Parse(t.FiltersJson).RootElement; } catch { }

        // Field-level drift analysis
        List<FieldDriftEntryDto>? driftEntries = null;
        bool hasDrift = false;

        if (includeDrift && t.Form?.Json != null)
        {
            var drift = driftAnalysis.Analyse(t, t.Form.Json);
            hasDrift = drift.HasDrift;
            driftEntries = drift.HasDrift ? drift.DriftEntries : null;
        }
        else if (!includeDrift && t.Form?.Json != null && !string.IsNullOrEmpty(t.SchemaVersion))
        {
            // On list view: compute cheaply without returning entries
            var fields = schemaResolver.ResolveFields(t.Form.Json);
            var currentVersion = DriftAnalysisService.ComputeFieldsHash(fields);
            hasDrift = t.SchemaVersion != currentVersion;
        }

        return new ReportTemplateDto
        {
            Id = t.Id,
            FormId = t.FormId,
            FormName = t.Form?.Name ?? string.Empty,
            Name = t.Name,
            Description = t.Description,
            IsPublic = t.IsPublic,
            CreatedBy = t.CreatedBy,
            CreatedAt = t.CreatedAt,
            UpdatedAt = t.UpdatedAt,
            Columns = columns,
            Filters = filters,
            DefaultSortField = t.DefaultSortField,
            DefaultSortDirection = t.DefaultSortDirection,
            DefaultPageSize = t.DefaultPageSize,
            DisplayMode = t.DisplayMode,
            HasSchemaDrift = hasDrift,
            FieldDrift = driftEntries,
            Tags = t.Tags?.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList() ?? [],
            Category = t.Category,
            SharedWithRoles = DeserializeRoles(t.SharedWithRolesJson),
            GroupBy = ParseJsonElement(t.GroupByJson),
            Measures = ParseJsonElement(t.MeasuresJson),
            IsFavourite = favouriteIds?.Contains(t.Id) ?? false,
            ChartType = t.ChartType,
            ChartConfig = ParseJsonElement(t.ChartConfigJson),
            DatasetId = t.DatasetId,
        };
    }

    private static JsonElement? ParseJsonElement(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try { return JsonDocument.Parse(json).RootElement; } catch { return null; }
    }

    // ── Favourites ────────────────────────────────────────────────────────────

    [HttpGet("favourites")]
    public async Task<IActionResult> GetFavourites()
    {
        var user = HttpContext.GetCurrentUser();
        if (user == null) return Unauthorized();

        var favouriteIds = await db.UserFavouriteReports
            .Where(f => f.UserId == user.Id)
            .Select(f => f.ReportTemplateId)
            .ToListAsync();

        return Ok(favouriteIds);
    }

    [HttpPost("{id:int}/favourite")]
    public async Task<IActionResult> AddFavourite(int id)
    {
        var user = HttpContext.GetCurrentUser();
        if (user == null) return Unauthorized();

        var template = await db.ReportTemplates.FindAsync(id);
        if (template == null) return NotFound();

        var exists = await db.UserFavouriteReports.AnyAsync(f => f.UserId == user.Id && f.ReportTemplateId == id);
        if (!exists)
        {
            db.UserFavouriteReports.Add(new UserFavouriteReport { UserId = user.Id, ReportTemplateId = id });
            await db.SaveChangesAsync();
        }
        return Ok();
    }

    [HttpDelete("{id:int}/favourite")]
    public async Task<IActionResult> RemoveFavourite(int id)
    {
        var user = HttpContext.GetCurrentUser();
        if (user == null) return Unauthorized();

        var fav = await db.UserFavouriteReports.FirstOrDefaultAsync(f => f.UserId == user.Id && f.ReportTemplateId == id);
        if (fav != null)
        {
            db.UserFavouriteReports.Remove(fav);
            await db.SaveChangesAsync();
        }
        return Ok();
    }

    // ── RLS Policies ──────────────────────────────────────────────────────────

    [HttpGet("{id:int}/rls-policies")]
    [RequirePermission(Permissions.Reports.Manage)]
    public async Task<IActionResult> GetRlsPolicies(int id)
    {
        var policies = await db.RlsPolicies
            .Where(p => p.ReportTemplateId == id)
            .OrderBy(p => p.Id)
            .Select(p => new
            {
                p.Id,
                p.Name,
                p.WhereFragment,
                p.AppliestoRoles,
                p.IsActive,
                p.CreatedAt,
            })
            .ToListAsync();
        return Ok(policies);
    }

    [HttpPost("{id:int}/rls-policies")]
    [RequirePermission(Permissions.Reports.Manage)]
    public async Task<IActionResult> AddRlsPolicy(int id, [FromBody] SaveRlsPolicyRequest body)
    {
        var template = await db.ReportTemplates.FindAsync(id);
        if (template == null) return NotFound();

        var policy = new RlsPolicy
        {
            ReportTemplateId = id,
            Name = body.Name,
            WhereFragment = body.WhereFragment,
            AppliestoRoles = body.AppliestoRoles,
            IsActive = body.IsActive,
        };
        db.RlsPolicies.Add(policy);
        await db.SaveChangesAsync();
        return Ok(new { policy.Id });
    }

    [HttpPut("{id:int}/rls-policies/{policyId:int}")]
    [RequirePermission(Permissions.Reports.Manage)]
    public async Task<IActionResult> UpdateRlsPolicy(int id, int policyId, [FromBody] SaveRlsPolicyRequest body)
    {
        var policy = await db.RlsPolicies.FirstOrDefaultAsync(p => p.Id == policyId && p.ReportTemplateId == id);
        if (policy == null) return NotFound();

        policy.Name = body.Name;
        policy.WhereFragment = body.WhereFragment;
        policy.AppliestoRoles = body.AppliestoRoles;
        policy.IsActive = body.IsActive;
        await db.SaveChangesAsync();
        return Ok();
    }

    [HttpDelete("{id:int}/rls-policies/{policyId:int}")]
    [RequirePermission(Permissions.Reports.Manage)]
    public async Task<IActionResult> DeleteRlsPolicy(int id, int policyId)
    {
        var policy = await db.RlsPolicies.FirstOrDefaultAsync(p => p.Id == policyId && p.ReportTemplateId == id);
        if (policy == null) return NotFound();
        db.RlsPolicies.Remove(policy);
        await db.SaveChangesAsync();
        return Ok();
    }

    // ── Execution Log ─────────────────────────────────────────────────────────

    /// <summary>Returns the last 20 distinct templates executed by the current user (recently used).</summary>
    [HttpGet("recently-used")]
    public async Task<IActionResult> RecentlyUsed()
    {
        var user = HttpContext.GetCurrentUser();
        if (user == null) return Unauthorized();

        var recentIds = await db.ReportExecutionLogs
            .Where(l => l.UserId == user.Id)
            .OrderByDescending(l => l.ExecutedAt)
            .Select(l => l.ReportTemplateId)
            .Distinct()
            .Take(20)
            .ToListAsync();

        return Ok(recentIds);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static List<string> DeserializeRoles(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try { return JsonSerializer.Deserialize<List<string>>(json) ?? []; }
        catch { return []; }
    }
}
