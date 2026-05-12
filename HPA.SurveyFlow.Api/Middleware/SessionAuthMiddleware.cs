using HPA.SurveyFlow.Infrastructure.Services;

namespace HPA.SurveyFlow.Api.Middleware;

public class SessionAuthMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, AuthService authService)
    {
        var authHeader = context.Request.Headers.Authorization.FirstOrDefault();
        if (authHeader != null && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            var token = authHeader["Bearer ".Length..].Trim();
            if (!string.IsNullOrEmpty(token))
            {
                var user = await authService.GetUserFromTokenAsync(token);
                if (user != null)
                {
                    context.Items["CurrentUser"] = user;
                }
            }
        }

        await next(context);
    }
}
