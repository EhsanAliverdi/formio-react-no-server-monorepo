using Serilog.Context;

namespace HPA.SurveyFlow.Api.Middleware;

/// <summary>
/// Assigns a correlation ID to every request.
/// Reads X-Correlation-ID from the incoming request header (so callers can pass their own),
/// generates a new GUID if absent, writes it to the response header, and pushes it into
/// Serilog's LogContext so every log line for this request carries the ID.
/// </summary>
public sealed class CorrelationIdMiddleware(RequestDelegate next)
{
    private const string HeaderName = "X-Correlation-ID";

    public async Task InvokeAsync(HttpContext context)
    {
        var correlationId = context.Request.Headers[HeaderName].FirstOrDefault()
            ?? Guid.NewGuid().ToString("N")[..16];  // short 16-char hex — readable in logs

        context.Items["CorrelationId"] = correlationId;
        context.Response.Headers[HeaderName] = correlationId;

        using (LogContext.PushProperty("CorrelationId", correlationId))
        {
            await next(context);
        }
    }
}
