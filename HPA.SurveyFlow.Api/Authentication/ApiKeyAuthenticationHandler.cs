using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using HPA.SurveyFlow.Domain.Security;
using HPA.SurveyFlow.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HPA.SurveyFlow.Api.Authentication;

/// <summary>
/// Accepts API keys via the <c>X-Api-Key</c> header.
/// Key format: {8-char-prefix}{rest} — prefix is stored in DB, SHA-256(full key) is the stored hash.
/// Scopes on the key become permission claims, enabling [RequirePermission] attributes to work normally.
/// </summary>
public sealed class ApiKeyAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    AppDbContext db)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "ApiKey";
    public const string HeaderName = "X-Api-Key";
    private const int PrefixLength = 8;

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue(HeaderName, out var raw) || string.IsNullOrWhiteSpace(raw))
            return AuthenticateResult.NoResult();

        var key = raw.ToString().Trim();
        if (key.Length <= PrefixLength)
            return AuthenticateResult.Fail("API key too short.");

        var prefix = key[..PrefixLength];
        var hash   = ComputeHash(key);

        var apiKey = await db.ApiKeys
            .Include(k => k.CreatedByUser)
            .FirstOrDefaultAsync(k => k.Prefix == prefix && k.KeyHash == hash && k.IsActive);

        if (apiKey == null)
            return AuthenticateResult.Fail("Invalid or revoked API key.");

        if (apiKey.ExpiresAt.HasValue && apiKey.ExpiresAt < DateTime.UtcNow)
            return AuthenticateResult.Fail("API key has expired.");

        // Update last used — fire and forget
        apiKey.LastUsedAt = DateTime.UtcNow;
        _ = db.SaveChangesAsync();

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, $"apikey:{apiKey.Id}"),
            new(ClaimTypes.Name, apiKey.Name),
            new(ClaimTypes.Role, "api"),
        };

        // Each scope becomes a permission claim
        foreach (var scope in apiKey.Scopes.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            claims.Add(new Claim(Permissions.ClaimType, scope));

        var identity  = new ClaimsIdentity(claims, SchemeName);
        var principal = new ClaimsPrincipal(identity);
        var ticket    = new AuthenticationTicket(principal, SchemeName);
        return AuthenticateResult.Success(ticket);
    }

    public static string ComputeHash(string key)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(key));
        return Convert.ToHexStringLower(bytes);
    }

    /// <summary>Generates a cryptographically random key and returns both the raw key and its prefix+hash.</summary>
    public static (string rawKey, string prefix, string hash) GenerateKey()
    {
        var raw    = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
                            .Replace("+", "-").Replace("/", "_").Replace("=", "");
        var prefix = raw[..PrefixLength];
        var hash   = ComputeHash(raw);
        return (raw, prefix, hash);
    }
}
