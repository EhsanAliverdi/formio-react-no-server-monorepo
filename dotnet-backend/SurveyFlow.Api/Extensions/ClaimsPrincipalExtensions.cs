using SurveyFlow.Core.Entities;

namespace SurveyFlow.Api.Extensions;

public static class HttpContextExtensions
{
    public static User? GetCurrentUser(this HttpContext ctx)
    {
        return ctx.Items["CurrentUser"] as User;
    }

    public static User RequireUser(this HttpContext ctx)
    {
        var user = ctx.Items["CurrentUser"] as User;
        if (user == null)
            throw new UnauthorizedAccessException("Authentication required.");
        return user;
    }

    public static User RequireRole(this HttpContext ctx, params string[] roles)
    {
        var user = ctx.Items["CurrentUser"] as User;
        if (user == null)
            throw new UnauthorizedAccessException("Authentication required.");
        if (!roles.Contains(user.Role))
            throw new UnauthorizedAccessException($"Role '{user.Role}' is not authorized for this action.");
        return user;
    }
}
