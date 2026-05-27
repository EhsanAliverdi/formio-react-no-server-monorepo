using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using HPA.SurveyFlow.Domain.Entities;
using HPA.SurveyFlow.Infrastructure.Data;

namespace HPA.SurveyFlow.Infrastructure.Services;

public class AuthService(AppDbContext db)
{
    private const int ScryptN = 16384;
    private const int ScryptR = 8;
    private const int ScryptP = 1;
    private const int ScryptKeyLen = 32;

    public string HashPassword(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(16);
        var saltHex = Convert.ToHexString(salt).ToLower();
        var hash = ComputeScrypt(password, salt);
        var hashHex = Convert.ToHexString(hash).ToLower();
        return $"scrypt{saltHex}{hashHex}";
    }

    public bool VerifyPassword(string password, string stored)
    {
        if (!stored.StartsWith("scrypt")) return false;
        var rest = stored["scrypt".Length..];
        if (rest.Length < 32 + 64) return false;
        var saltHex = rest[..32];
        var storedHashHex = rest[32..];
        var salt = Convert.FromHexString(saltHex);
        var computed = ComputeScrypt(password, salt);
        var computedHex = Convert.ToHexString(computed).ToLower();
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(computedHex),
            Encoding.UTF8.GetBytes(storedHashHex));
    }

    private static byte[] ComputeScrypt(string password, byte[] salt)
    {
        var passwordBytes = Encoding.UTF8.GetBytes(password);
        return Org.BouncyCastle.Crypto.Generators.SCrypt.Generate(
            passwordBytes, salt, ScryptN, ScryptR, ScryptP, ScryptKeyLen);
    }

    public async Task<(string token, DateTime expiresAt)> CreateSessionAsync(int userId)
    {
        var rawBytes = RandomNumberGenerator.GetBytes(32);
        var rawToken = Convert.ToBase64String(rawBytes)
            .Replace('+', '-').Replace('/', '_').TrimEnd('=');
        var tokenHash = ComputeSha256(rawToken);
        var expiresAt = DateTime.UtcNow.AddDays(7);

        db.Sessions.Add(new Session
        {
            UserId = userId,
            TokenHash = tokenHash,
            ExpiresAt = expiresAt
        });
        await db.SaveChangesAsync();
        return (rawToken, expiresAt);
    }

    public async Task DeleteSessionByTokenAsync(string rawToken)
    {
        var tokenHash = ComputeSha256(rawToken);
        var session = await db.Sessions.FirstOrDefaultAsync(s => s.TokenHash == tokenHash);
        if (session != null)
        {
            db.Sessions.Remove(session);
            await db.SaveChangesAsync();
        }
    }

    public async Task<User?> GetUserFromTokenAsync(string rawToken)
    {
        var tokenHash = ComputeSha256(rawToken);
        var session = await db.Sessions
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.TokenHash == tokenHash && s.ExpiresAt > DateTime.UtcNow);
        return session?.User;
    }

    public async Task CleanExpiredSessionsAsync()
    {
        var expired = await db.Sessions
            .Where(s => s.ExpiresAt <= DateTime.UtcNow)
            .ToListAsync();
        if (expired.Count > 0)
        {
            db.Sessions.RemoveRange(expired);
            await db.SaveChangesAsync();
        }
    }

    private static string ComputeSha256(string input)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(bytes).ToLower();
    }
}
