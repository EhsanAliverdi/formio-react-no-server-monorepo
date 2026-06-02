using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HPA.SurveyFlow.Domain.DTOs.Requests;
using HPA.SurveyFlow.Infrastructure.Data;
using HPA.SurveyFlow.Infrastructure.Services;

namespace HPA.SurveyFlow.Api.Controllers;

/// <summary>
/// Checks whether a specific form field answer has already been submitted for the same
/// asset within a time window, and what actions were taken on those prior reports.
/// Used by formio's custom validation URL feature to warn users before they submit a duplicate.
/// </summary>
[ApiController]
[Route("api/forms/{formId:int}/field-check")]
[AllowAnonymous]
public class FieldCheckController(AppDbContext db, FieldCheckService fieldCheckService) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Check(int formId, [FromBody] FieldCheckRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FieldKey))
            return BadRequest(new { error = "field_key is required." });

        if (string.IsNullOrWhiteSpace(request.FieldValue))
            return BadRequest(new { error = "field_value is required." });

        if (string.IsNullOrWhiteSpace(request.TriggerValue))
            return BadRequest(new { error = "trigger_value is required." });

        var formExists = await db.Forms.AnyAsync(f => f.Id == formId);
        if (!formExists) return NotFound(new { error = "Form not found." });

        var result = await fieldCheckService.CheckAsync(formId, request);
        return Ok(result);
    }
}
