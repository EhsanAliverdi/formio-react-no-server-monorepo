using HPA.SurveyFlow.Infrastructure.Services;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace HPA.SurveyFlow.Api.Health;

public sealed class HeadlessChromiumHealthCheck(PdfService pdfService) : IHealthCheck
{
    private static readonly TimeSpan Timeout = TimeSpan.FromSeconds(10);

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await pdfService.CheckHealthAsync().WaitAsync(Timeout, cancellationToken);
            return HealthCheckResult.Healthy("Headless Chromium is available.");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("Headless Chromium health check failed.", ex);
        }
    }
}
