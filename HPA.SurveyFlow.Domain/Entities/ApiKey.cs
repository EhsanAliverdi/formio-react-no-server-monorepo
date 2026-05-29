namespace HPA.SurveyFlow.Domain.Entities;

/// <summary>
/// Programmatic API key for machine-to-machine access.
/// The full key is shown only once at creation — only the SHA-256 hash is stored.
/// The first 8 chars of the raw key are stored as <see cref="Prefix"/> for lookup.
/// </summary>
public class ApiKey
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;

    /// <summary>First 8 chars of the raw key — used to look up the row without full table scan.</summary>
    public string Prefix { get; set; } = null!;

    /// <summary>SHA-256 hex of the full raw key.</summary>
    public string KeyHash { get; set; } = null!;

    /// <summary>Comma-separated scope names, e.g. "reports.read,forms.read".</summary>
    public string Scopes { get; set; } = string.Empty;

    public int CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastUsedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public bool IsActive { get; set; } = true;

    public User CreatedByUser { get; set; } = null!;
}
