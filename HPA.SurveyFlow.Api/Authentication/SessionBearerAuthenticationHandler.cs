using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using HPA.SurveyFlow.Infrastructure.Services;
using HPA.SurveyFlow.Domain.Security;

namespace HPA.SurveyFlow.Api.Authentication;

public sealed class SessionBearerAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    AuthService authService)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "SessionBearer";

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var authHeader = Request.Headers.Authorization.FirstOrDefault();
        if (string.IsNullOrWhiteSpace(authHeader))
            return AuthenticateResult.NoResult();

        if (!authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            return AuthenticateResult.NoResult();

        var token = authHeader["Bearer ".Length..].Trim();
        if (string.IsNullOrWhiteSpace(token))
            return AuthenticateResult.Fail("Bearer token is empty.");

        var user = await authService.GetUserFromTokenAsync(token);
        if (user is null)
            return AuthenticateResult.Fail("Invalid or expired bearer token.");

        Context.Items["CurrentUser"] = user;

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Role, user.Role),
        };

        if (!string.IsNullOrWhiteSpace(user.DisplayName))
            claims.Add(new Claim(ClaimTypes.Name, user.DisplayName));

        foreach (var permission in RolePermissionMap.ForRole(user.Role))
            claims.Add(new Claim(Permissions.ClaimType, permission));

        var identity = new ClaimsIdentity(claims, SchemeName);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, SchemeName);
        return AuthenticateResult.Success(ticket);
    }
}
