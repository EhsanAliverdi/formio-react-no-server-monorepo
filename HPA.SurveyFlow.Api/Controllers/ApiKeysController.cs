using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HPA.SurveyFlow.Api.Authentication;
using HPA.SurveyFlow.Api.Authorization;
using HPA.SurveyFlow.Api.Extensions;
using HPA.SurveyFlow.Domain.Entities;
using HPA.SurveyFlow.Domain.Security;
using HPA.SurveyFlow.Infrastructure.Data;

namespace HPA.SurveyFlow.Api.Controllers;

[ApiController]
[Route("api/api-keys")]
[RequirePermission(Permissions.ApiKeys.Manage)]
public class ApiKeysController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] bool paged = false, [FromQuery] int limit = 25, [FromQuery] int offset = 0)
    {
        limit = Math.Clamp(limit, 1, 200);
        offset = Math.Max(0, offset);
        var query = db.ApiKeys
            .AsNoTracking()
            .OrderByDescending(k => k.CreatedAt);
        var total = await query.CountAsync();
        if (paged)
        {
            var items = await query.Skip(offset).Take(limit).Select(k => new
            {
                k.Id, k.Name, k.Prefix, k.Scopes, k.IsActive,
                k.CreatedBy, k.CreatedAt, k.LastUsedAt, k.ExpiresAt,
            }).ToListAsync();
            return Ok(new { items, total, limit, offset });
        }

        var keys = await query.Select(k => new
        {
            k.Id, k.Name, k.Prefix, k.Scopes, k.IsActive,
            k.CreatedBy, k.CreatedAt, k.LastUsedAt, k.ExpiresAt,
        }).ToListAsync();
        return Ok(keys);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateApiKeyRequest body)
    {
        var user = HttpContext.GetCurrentUser();
        if (user == null) return Unauthorized();

        var (rawKey, prefix, hash) = ApiKeyAuthenticationHandler.GenerateKey();

        var key = new ApiKey
        {
            Name      = body.Name.Trim(),
            Prefix    = prefix,
            KeyHash   = hash,
            Scopes    = body.Scopes?.Trim() ?? string.Empty,
            CreatedBy = user.Id,
            ExpiresAt = body.ExpiresAt,
            IsActive  = true,
        };

        db.ApiKeys.Add(key);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(List), null, new
        {
            id         = key.Id,
            name       = key.Name,
            key        = rawKey,  // plaintext returned only here
            prefix     = key.Prefix,
            scopes     = key.Scopes,
            expires_at = key.ExpiresAt,
            created_at = key.CreatedAt,
        });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Revoke(int id)
    {
        var key = await db.ApiKeys.FindAsync(id);
        if (key == null) return NotFound(new { error = "API key not found." });
        key.IsActive = false;
        await db.SaveChangesAsync();
        return NoContent();
    }
}

public sealed record CreateApiKeyRequest(string Name, string? Scopes, DateTime? ExpiresAt);
