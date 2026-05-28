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
        [FromQuery] int? createdBy)
    {
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

        // Viewers see public templates + templates shared with their role
        if (!isManager)
        {
            var role = user?.Role ?? "";
            query = query.Where(t =>
                t.IsPublic ||
                (t.SharedWithRolesJson != null && t.SharedWithRolesJson.Contains(role)));
        }

        var templates = await query.OrderByDescending(t => t.UpdatedAt).ToListAsync();
        return Ok(templates.Select(t => MapDto(t, includeDrift: false)));
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

        return Ok(MapDto(template, includeDrift: true));
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

    private ReportTemplateDto MapDto(ReportTemplate t, bool includeDrift)
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
        };
    }

    private static List<string> DeserializeRoles(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try { return JsonSerializer.Deserialize<List<string>>(json) ?? []; }
        catch { return []; }
    }
}
