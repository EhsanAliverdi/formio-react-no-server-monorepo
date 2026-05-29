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

namespace HPA.SurveyFlow.Api.Controllers;

[ApiController]
[Route("api/datasets")]
[RequirePermission(Permissions.Reports.Read)]
public class DatasetsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int? formId)
    {
        var query = db.Datasets.Include(d => d.Form).Where(d => d.IsActive);
        if (formId.HasValue)
            query = query.Where(d => d.FormId == formId.Value);

        var datasets = await query.OrderBy(d => d.Name).ToListAsync();
        return Ok(datasets.Select(MapDto));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id)
    {
        var dataset = await db.Datasets.Include(d => d.Form).FirstOrDefaultAsync(d => d.Id == id);
        if (dataset == null) return NotFound(new { error = "Dataset not found." });
        return Ok(MapDto(dataset));
    }

    [HttpPost]
    [RequirePermission(Permissions.Reports.Manage)]
    public async Task<IActionResult> Create([FromBody] SaveDatasetRequest body)
    {
        var user = HttpContext.GetCurrentUser();
        if (user == null) return Unauthorized();

        var form = await db.Forms.FindAsync(body.FormId);
        if (form == null) return NotFound(new { error = "Form not found." });

        var dataset = new Dataset
        {
            Name = body.Name.Trim(),
            Description = body.Description?.Trim(),
            FormId = body.FormId,
            BaseFiltersJson = body.BaseFilters.HasValue ? body.BaseFilters.Value.GetRawText() : null,
            FieldsJson = body.Fields.HasValue ? body.Fields.Value.GetRawText() : null,
            CreatedBy = user.Id,
            IsActive = true,
        };

        db.Datasets.Add(dataset);
        await db.SaveChangesAsync();
        dataset.Form = form;
        return CreatedAtAction(nameof(Get), new { id = dataset.Id }, MapDto(dataset));
    }

    [HttpPut("{id:int}")]
    [RequirePermission(Permissions.Reports.Manage)]
    public async Task<IActionResult> Update(int id, [FromBody] SaveDatasetRequest body)
    {
        var dataset = await db.Datasets.Include(d => d.Form).FirstOrDefaultAsync(d => d.Id == id);
        if (dataset == null) return NotFound(new { error = "Dataset not found." });

        if (dataset.FormId != body.FormId)
        {
            var form = await db.Forms.FindAsync(body.FormId);
            if (form == null) return NotFound(new { error = "Form not found." });
            dataset.Form = form;
        }

        dataset.Name = body.Name.Trim();
        dataset.Description = body.Description?.Trim();
        dataset.FormId = body.FormId;
        dataset.BaseFiltersJson = body.BaseFilters.HasValue ? body.BaseFilters.Value.GetRawText() : null;
        dataset.FieldsJson = body.Fields.HasValue ? body.Fields.Value.GetRawText() : null;
        dataset.IsActive = body.IsActive;
        dataset.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Ok(MapDto(dataset));
    }

    [HttpDelete("{id:int}")]
    [RequirePermission(Permissions.Reports.Manage)]
    public async Task<IActionResult> Delete(int id)
    {
        var dataset = await db.Datasets.FindAsync(id);
        if (dataset == null) return NotFound(new { error = "Dataset not found." });
        // Soft-delete so existing templates that reference it don't break
        dataset.IsActive = false;
        dataset.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static DatasetDto MapDto(Dataset d) => new()
    {
        Id = d.Id,
        Name = d.Name,
        Description = d.Description,
        FormId = d.FormId,
        FormName = d.Form?.Name ?? string.Empty,
        BaseFilters = ParseJson(d.BaseFiltersJson),
        Fields = ParseJson(d.FieldsJson),
        CreatedBy = d.CreatedBy,
        CreatedAt = d.CreatedAt,
        UpdatedAt = d.UpdatedAt,
        IsActive = d.IsActive,
    };

    private static JsonElement? ParseJson(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try { return JsonDocument.Parse(json).RootElement; } catch { return null; }
    }
}
