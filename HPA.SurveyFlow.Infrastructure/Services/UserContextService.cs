using System.Text.RegularExpressions;
using HPA.SurveyFlow.Domain.Entities;

namespace HPA.SurveyFlow.Infrastructure.Services;

/// <summary>
/// Resolves Tier-1 system variables and applies active RLS policies to a SQL WHERE clause.
///
/// Tier-1 variables (invisible — injected server-side, never sent to the client):
///   {{CurrentUser}}       — authenticated user's email address
///   {{CurrentUserRole}}   — authenticated user's role string
///   {{Today}}             — UTC date as yyyy-MM-dd
///   {{StartOfMonth}}      — first day of the current UTC month as yyyy-MM-dd
///   {{EndOfMonth}}        — last day of the current UTC month as yyyy-MM-dd
///   {{StartOfYear}}       — first day of the current UTC year as yyyy-MM-dd
///
/// RLS is fail-closed: if a policy cannot be parsed, execution is blocked.
/// Admin role bypasses all RLS policies.
/// </summary>
public class UserContextService
{
    private static readonly Regex VarPattern =
        new(@"\{\{(\w+)\}\}", RegexOptions.Compiled | RegexOptions.IgnoreCase);

    /// <summary>
    /// Resolves all system variable placeholders in <paramref name="fragment"/> using
    /// the provided user context. Returns the resolved fragment with SQL-safe string literals.
    /// Throws <see cref="InvalidOperationException"/> if an unknown variable is encountered.
    /// </summary>
    public string ResolveVariables(string fragment, User? user)
    {
        return VarPattern.Replace(fragment, m =>
        {
            var name = m.Groups[1].Value.ToLowerInvariant();
            var now = DateTime.UtcNow;
            return name switch
            {
                "currentuser"      => Escape(user?.Email ?? string.Empty),
                "currentuserrole"  => Escape(user?.Role ?? string.Empty),
                "today"            => Escape(now.ToString("yyyy-MM-dd")),
                "startofmonth"     => Escape(new DateTime(now.Year, now.Month, 1).ToString("yyyy-MM-dd")),
                "endofmonth"       => Escape(new DateTime(now.Year, now.Month, DateTime.DaysInMonth(now.Year, now.Month)).ToString("yyyy-MM-dd")),
                "startofyear"      => Escape(new DateTime(now.Year, 1, 1).ToString("yyyy-MM-dd")),
                _ => throw new InvalidOperationException($"Unknown system variable: {{{{{m.Groups[1].Value}}}}}")
            };
        });
    }

    /// <summary>
    /// Builds an additional AND clause from all active RLS policies that apply to the given user.
    /// Returns null when no policies apply (admin bypass, or no active policies).
    /// Throws if any policy variable resolution fails (fail-closed).
    /// </summary>
    public string? BuildRlsClause(IEnumerable<RlsPolicy> policies, User? user)
    {
        // Admin role bypasses all RLS
        if (user?.Role == "admin") return null;

        var userRole = user?.Role ?? string.Empty;
        var fragments = new List<string>();

        foreach (var policy in policies.Where(p => p.IsActive))
        {
            // Check if policy applies to this role (empty = applies to all non-admin)
            if (!string.IsNullOrWhiteSpace(policy.AppliestoRoles))
            {
                var roles = policy.AppliestoRoles.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                if (!roles.Contains(userRole, StringComparer.OrdinalIgnoreCase))
                    continue;
            }

            var resolved = ResolveVariables(policy.WhereFragment, user);
            fragments.Add($"({resolved})");
        }

        return fragments.Count == 0 ? null : string.Join(" AND ", fragments);
    }

    // Single-quotes the value and escapes internal single quotes (SQL literal).
    private static string Escape(string value) => $"'{value.Replace("'", "''")}'";
}
