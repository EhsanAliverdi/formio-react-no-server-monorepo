using System.Security.Cryptography;
using System.Text;
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
public class ReportTemplatesController(AppDbContext db, FormSchemaResolverService schemaResolver) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int? formId)
    {
        var user = HttpContext.GetCurrentUser();
        var isManager = user?.Role is "admin" or "editor";

        var query = db.ReportTemplates
            .Include(t => t.Form)
            .AsQueryable();

        if (formId.HasValue)
            query = query.Where(t => t.FormId == formId.Value);

        // Viewers only see public templates
        if (!isManager)
            query = query.Where(t => t.IsPublic);

        var templates = await query
            .OrderByDescending(t => t.UpdatedAt)
            .ToListAsync();

        return Ok(templates.Select(t => MapDto(t)));
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
        if (!isManager && !template.IsPublic) return Forbid();

        return Ok(MapDto(template));
    }

    [HttpGet("form-fields/{formId:int}")]
    public async Task<IActionResult> GetFormFields(int formId)
    {
        var form = await db.Forms.FindAsync(formId);
        if (form == null) return NotFound(new { error = "Form not found." });

        var fields = schemaResolver.ResolveFields(form.Json);
        return Ok(fields);
    }

    [HttpPost]
    [RequirePermission(Permissions.Reports.Manage)]
    public async Task<IActionResult> Create([FromBody] SaveReportTemplateRequest body)
    {
        var user = HttpContext.GetCurrentUser();
        if (user == null) return Unauthorized();

        var form = await db.Forms.FindAsync(body.FormId);
        if (form == null) return NotFound(new { error = "Form not found." });

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
            SchemaVersion = ComputeSchemaVersion(form.Json),
        };

        db.ReportTemplates.Add(template);
        await db.SaveChangesAsync();

        // Reload with Form navigation
        template.Form = form;
        return CreatedAtAction(nameof(Get), new { id = template.Id }, MapDto(template));
    }

    [HttpPut("{id:int}")]
    [RequirePermission(Permissions.Reports.Manage)]
    public async Task<IActionResult> Update(int id, [FromBody] SaveReportTemplateRequest body)
    {
        var template = await db.ReportTemplates
            .Include(t => t.Form)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (template == null) return NotFound(new { error = "Report template not found." });

        var form = template.Form;
        if (form.Id != body.FormId)
        {
            form = await db.Forms.FindAsync(body.FormId);
            if (form == null) return NotFound(new { error = "Form not found." });
        }

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
        template.SchemaVersion = ComputeSchemaVersion(form.Json);

        await db.SaveChangesAsync();
        template.Form = form;
        return Ok(MapDto(template));
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

    private ReportTemplateDto MapDto(ReportTemplate t)
    {
        List<ReportColumnDefinitionDto> columns;
        try { columns = JsonSerializer.Deserialize<List<ReportColumnDefinitionDto>>(t.ColumnsJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? []; }
        catch { columns = []; }

        JsonElement? filters = null;
        if (!string.IsNullOrWhiteSpace(t.FiltersJson))
        {
            try { filters = JsonDocument.Parse(t.FiltersJson).RootElement; }
            catch { }
        }

        var currentSchemaVersion = t.Form?.Json != null ? ComputeSchemaVersion(t.Form.Json) : null;

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
            HasSchemaDrift = currentSchemaVersion != null
                && !string.IsNullOrEmpty(t.SchemaVersion)
                && t.SchemaVersion != currentSchemaVersion,
        };
    }

    private static string ComputeSchemaVersion(string formJson)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(formJson.Trim()));
        return Convert.ToHexString(bytes)[..16];
    }
}
