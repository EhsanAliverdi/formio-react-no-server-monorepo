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
[Route("api/forms/{formId:int}/integration-rules")]
[RequirePermission(Permissions.Forms.Manage)]
public class IntegrationRulesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(int formId)
    {
        var exists = await db.Forms.AnyAsync(f => f.Id == formId);
        if (!exists) return NotFound(new { error = "Form not found." });

        var rules = await db.FormIntegrationRules
            .Include(r => r.MexConfig)
            .Include(r => r.WebhookConfig)
            .Where(r => r.FormId == formId)
            .OrderBy(r => r.SortOrder).ThenBy(r => r.Id)
            .ToListAsync();

        return Ok(rules.Select(MapDto));
    }

    [HttpPost]
    public async Task<IActionResult> Create(int formId, [FromBody] SaveIntegrationRuleRequest body)
    {
        var exists = await db.Forms.AnyAsync(f => f.Id == formId);
        if (!exists) return NotFound(new { error = "Form not found." });

        var rule = new FormIntegrationRule
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

        db.FormIntegrationRules.Add(rule);
        await db.SaveChangesAsync();

        await UpsertChannelConfig(rule, body);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { formId, id = rule.Id }, MapDto(rule));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int formId, int id)
    {
        var rule = await db.FormIntegrationRules
            .Include(r => r.MexConfig)
            .Include(r => r.WebhookConfig)
            .FirstOrDefaultAsync(r => r.Id == id && r.FormId == formId);

        if (rule == null) return NotFound(new { error = "Integration rule not found." });
        return Ok(MapDto(rule));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int formId, int id, [FromBody] SaveIntegrationRuleRequest body)
    {
        var rule = await db.FormIntegrationRules
            .Include(r => r.MexConfig)
            .Include(r => r.WebhookConfig)
            .FirstOrDefaultAsync(r => r.Id == id && r.FormId == formId);

        if (rule == null) return NotFound(new { error = "Integration rule not found." });

        rule.Name = body.Name;
        rule.Enabled = body.Enabled;
        rule.Channel = body.Channel;
        rule.ConditionGroupJson = JsonSerializer.Serialize(body.ConditionGroup);
        rule.SortOrder = body.SortOrder;
        rule.UpdatedAt = DateTime.UtcNow;

        // Remove stale channel config when channel changes
        if (rule.Channel != "mex" && rule.MexConfig != null)
            db.FormIntegrationRuleMexConfigs.Remove(rule.MexConfig);
        if (rule.Channel != "webhook" && rule.WebhookConfig != null)
            db.FormIntegrationRuleWebhooks.Remove(rule.WebhookConfig);

        await UpsertChannelConfig(rule, body);
        await db.SaveChangesAsync();
        return Ok(MapDto(rule));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int formId, int id)
    {
        var rule = await db.FormIntegrationRules
            .FirstOrDefaultAsync(r => r.Id == id && r.FormId == formId);

        if (rule == null) return NotFound(new { error = "Integration rule not found." });

        db.FormIntegrationRules.Remove(rule);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("reorder")]
    public async Task<IActionResult> Reorder(int formId, [FromBody] List<int> orderedIds)
    {
        var rules = await db.FormIntegrationRules
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

    private async Task UpsertChannelConfig(FormIntegrationRule rule, SaveIntegrationRuleRequest body)
    {
        if (body.Channel == "mex" && body.MexConfig != null)
        {
            var mappingsJson = JsonSerializer.Serialize(body.MexConfig.FieldMappings);
            if (rule.MexConfig != null)
            {
                rule.MexConfig.Action = body.MexConfig.Action;
                rule.MexConfig.ContactIdField = body.MexConfig.ContactIdField;
                rule.MexConfig.JobTypeField = body.MexConfig.JobTypeField;
                rule.MexConfig.FieldMappingsJson = mappingsJson;
            }
            else
            {
                var mex = new FormIntegrationRuleMex
                {
                    RuleId = rule.Id,
                    Action = body.MexConfig.Action,
                    ContactIdField = body.MexConfig.ContactIdField,
                    JobTypeField = body.MexConfig.JobTypeField,
                    FieldMappingsJson = mappingsJson,
                };
                db.FormIntegrationRuleMexConfigs.Add(mex);
                rule.MexConfig = mex;
            }
        }
        else if (body.Channel == "webhook" && body.WebhookConfig != null)
        {
            var headersJson = JsonSerializer.Serialize(body.WebhookConfig.Headers);
            if (rule.WebhookConfig != null)
            {
                rule.WebhookConfig.Url = body.WebhookConfig.Url;
                rule.WebhookConfig.Method = body.WebhookConfig.Method;
                rule.WebhookConfig.HeadersJson = headersJson;
                rule.WebhookConfig.BodyTemplate = body.WebhookConfig.BodyTemplate;
            }
            else
            {
                var wh = new FormIntegrationRuleWebhook
                {
                    RuleId = rule.Id,
                    Url = body.WebhookConfig.Url,
                    Method = body.WebhookConfig.Method,
                    HeadersJson = headersJson,
                    BodyTemplate = body.WebhookConfig.BodyTemplate,
                };
                db.FormIntegrationRuleWebhooks.Add(wh);
                rule.WebhookConfig = wh;
            }
        }

        await Task.CompletedTask;
    }

    private static IntegrationRuleDto MapDto(FormIntegrationRule rule)
    {
        JsonElement conditionGroup;
        try { conditionGroup = JsonDocument.Parse(rule.ConditionGroupJson).RootElement; }
        catch { conditionGroup = JsonDocument.Parse("{}").RootElement; }

        IntegrationRuleMexDto? mexDto = null;
        if (rule.MexConfig is { } mex)
        {
            JsonElement mappings;
            try { mappings = JsonDocument.Parse(mex.FieldMappingsJson).RootElement; }
            catch { mappings = JsonDocument.Parse("{}").RootElement; }

            mexDto = new IntegrationRuleMexDto
            {
                Action = mex.Action,
                ContactIdField = mex.ContactIdField,
                JobTypeField = mex.JobTypeField,
                FieldMappings = mappings,
            };
        }

        IntegrationRuleWebhookDto? webhookDto = null;
        if (rule.WebhookConfig is { } wh)
        {
            JsonElement headers;
            try { headers = JsonDocument.Parse(wh.HeadersJson).RootElement; }
            catch { headers = JsonDocument.Parse("[]").RootElement; }

            webhookDto = new IntegrationRuleWebhookDto
            {
                Url = wh.Url,
                Method = wh.Method,
                Headers = headers,
                BodyTemplate = wh.BodyTemplate,
            };
        }

        return new IntegrationRuleDto
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
            MexConfig = mexDto,
            WebhookConfig = webhookDto,
        };
    }
}
