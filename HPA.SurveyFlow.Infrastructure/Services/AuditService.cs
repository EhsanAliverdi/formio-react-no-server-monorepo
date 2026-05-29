using System.Text.Json;
using HPA.SurveyFlow.Domain.Entities;
using HPA.SurveyFlow.Infrastructure.Data;

namespace HPA.SurveyFlow.Infrastructure.Services;

/// <summary>
/// Writes tamper-evident audit entries.  Call from controllers after successful mutations.
/// Designed to be fire-and-forget friendly — errors are swallowed so auditing never breaks the main flow.
/// </summary>
public class AuditService(AppDbContext db)
{
    public async Task LogAsync(
        int? actorId,
        string actorEmail,
        string action,
        string entityType,
        string entityId,
        string? entityName = null,
        object? before = null,
        object? after = null,
        string? ipAddress = null)
    {
        try
        {
            string? changesJson = null;
            if (before != null || after != null)
            {
                changesJson = JsonSerializer.Serialize(new
                {
                    before,
                    after,
                });
            }

            db.AuditLogs.Add(new AuditLog
            {
                ActorId     = actorId,
                ActorEmail  = actorEmail,
                Action      = action,
                EntityType  = entityType,
                EntityId    = entityId,
                EntityName  = entityName,
                ChangesJson = changesJson,
                IpAddress   = ipAddress,
                OccurredAt  = DateTime.UtcNow,
            });

            await db.SaveChangesAsync();
        }
        catch
        {
            // Audit failures must never propagate to callers.
        }
    }

    /// <summary>Convenience overload for simple action-only events (no diff).</summary>
    public Task LogAsync(int? actorId, string actorEmail, string action, string entityType, string entityId, string? entityName, string? ipAddress)
        => LogAsync(actorId, actorEmail, action, entityType, entityId, entityName, null, null, ipAddress);
}
