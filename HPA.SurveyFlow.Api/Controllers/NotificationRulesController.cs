using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using HPA.SurveyFlow.Api.Authorization;
using HPA.SurveyFlow.Domain.DTOs.Requests;
using HPA.SurveyFlow.Domain.DTOs.Responses;
using HPA.SurveyFlow.Domain.Entities;
using HPA.SurveyFlow.Domain.Security;
using HPA.SurveyFlow.Infrastructure.Data;

namespace HPA.SurveyFlow.Api.Controllers;

[ApiController]
[Route("api/forms/{formId:int}/notification-rules")]
[RequirePermission(Permissions.Forms.Manage)]
public class NotificationRulesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(int formId)
    {
        var exists = await db.Forms.AnyAsync(f => f.Id == formId);
        if (!exists) return NotFound(new { error = "Form not found." });

        var rules = await db.FormNotificationRules
            .Include(r => r.EmailConfig)
            .Where(r => r.FormId == formId)
            .OrderBy(r => r.SortOrder)
            .ThenBy(r => r.Id)
            .ToListAsync();

        return Ok(rules.Select(MapDto));
    }

    [HttpPost]
    public async Task<IActionResult> Create(int formId, [FromBody] SaveNotificationRuleRequest body)
    {
        var exists = await db.Forms.AnyAsync(f => f.Id == formId);
        if (!exists) return NotFound(new { error = "Form not found." });

        var rule = new FormNotificationRule
        {
            FormId = formId,
            Name = body.Name,
            Enabled = body.Enabled,
            Channel = body.Channel,
            ConditionGroupJson = JsonSerializer.Serialize(body.ConditionGroup),
            SortOrder = body.SortOrder,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        db.FormNotificationRules.Add(rule);
        await db.SaveChangesAsync();

        if (body.Channel == "email" && body.EmailConfig != null)
        {
            var emailConfig = new FormNotificationRuleEmail
            {
                RuleId = rule.Id,
                ToAddressesJson = JsonSerializer.Serialize(body.EmailConfig.ToAddresses),
                Subject = body.EmailConfig.Subject,
                BodyHtml = body.EmailConfig.BodyHtml,
                AttachPdf = body.EmailConfig.AttachPdf,
            };
            db.FormNotificationRuleEmails.Add(emailConfig);
            await db.SaveChangesAsync();
            rule.EmailConfig = emailConfig;
        }

        return CreatedAtAction(nameof(Get), new { formId, id = rule.Id }, MapDto(rule));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int formId, int id)
    {
        var rule = await db.FormNotificationRules
            .Include(r => r.EmailConfig)
            .FirstOrDefaultAsync(r => r.Id == id && r.FormId == formId);

        if (rule == null) return NotFound(new { error = "Notification rule not found." });
        return Ok(MapDto(rule));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int formId, int id, [FromBody] SaveNotificationRuleRequest body)
    {
        var rule = await db.FormNotificationRules
            .Include(r => r.EmailConfig)
            .FirstOrDefaultAsync(r => r.Id == id && r.FormId == formId);

        if (rule == null) return NotFound(new { error = "Notification rule not found." });

        rule.Name = body.Name;
        rule.Enabled = body.Enabled;
        rule.Channel = body.Channel;
        rule.ConditionGroupJson = JsonSerializer.Serialize(body.ConditionGroup);
        rule.SortOrder = body.SortOrder;
        rule.UpdatedAt = DateTime.UtcNow;

        if (body.Channel == "email" && body.EmailConfig != null)
        {
            if (rule.EmailConfig != null)
            {
                rule.EmailConfig.ToAddressesJson = JsonSerializer.Serialize(body.EmailConfig.ToAddresses);
                rule.EmailConfig.Subject = body.EmailConfig.Subject;
                rule.EmailConfig.BodyHtml = body.EmailConfig.BodyHtml;
                rule.EmailConfig.AttachPdf = body.EmailConfig.AttachPdf;
            }
            else
            {
                db.FormNotificationRuleEmails.Add(new FormNotificationRuleEmail
                {
                    RuleId = rule.Id,
                    ToAddressesJson = JsonSerializer.Serialize(body.EmailConfig.ToAddresses),
                    Subject = body.EmailConfig.Subject,
                    BodyHtml = body.EmailConfig.BodyHtml,
                    AttachPdf = body.EmailConfig.AttachPdf,
                });
            }
        }
        else if (rule.EmailConfig != null && body.Channel != "email")
        {
            db.FormNotificationRuleEmails.Remove(rule.EmailConfig);
        }

        await db.SaveChangesAsync();
        return Ok(MapDto(rule));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int formId, int id)
    {
        var rule = await db.FormNotificationRules
            .FirstOrDefaultAsync(r => r.Id == id && r.FormId == formId);

        if (rule == null) return NotFound(new { error = "Notification rule not found." });

        db.FormNotificationRules.Remove(rule);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("reorder")]
    public async Task<IActionResult> Reorder(int formId, [FromBody] List<int> orderedIds)
    {
        var rules = await db.FormNotificationRules
            .Where(r => r.FormId == formId && orderedIds.Contains(r.Id))
            .ToListAsync();

        for (var i = 0; i < orderedIds.Count; i++)
        {
            var rule = rules.FirstOrDefault(r => r.Id == orderedIds[i]);
            if (rule != null) rule.SortOrder = i;
        }

        await db.SaveChangesAsync();
        return NoContent();
    }

    private static NotificationRuleDto MapDto(FormNotificationRule rule)
    {
        JsonElement conditionGroup;
        try { conditionGroup = JsonDocument.Parse(rule.ConditionGroupJson).RootElement; }
        catch { conditionGroup = JsonDocument.Parse("{}").RootElement; }

        return new NotificationRuleDto
        {
            Id = rule.Id,
            FormId = rule.FormId,
            Name = rule.Name,
            Enabled = rule.Enabled,
            Channel = rule.Channel,
            ConditionGroup = conditionGroup,
            SortOrder = rule.SortOrder,
            CreatedAt = rule.CreatedAt,
            UpdatedAt = rule.UpdatedAt,
            EmailConfig = rule.EmailConfig == null ? null : new NotificationRuleEmailDto
            {
                ToAddresses = JsonSerializer.Deserialize<List<string>>(rule.EmailConfig.ToAddressesJson) ?? [],
                Subject = rule.EmailConfig.Subject,
                BodyHtml = rule.EmailConfig.BodyHtml,
                AttachPdf = rule.EmailConfig.AttachPdf,
            }
        };
    }
}
