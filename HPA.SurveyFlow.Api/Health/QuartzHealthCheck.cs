using Microsoft.Extensions.Diagnostics.HealthChecks;
using Quartz;

namespace HPA.SurveyFlow.Api.Health;

public sealed class QuartzHealthCheck(ISchedulerFactory schedulerFactory) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var scheduler = await schedulerFactory.GetScheduler(cancellationToken);

            if (scheduler.IsShutdown)
            {
                return HealthCheckResult.Unhealthy("Quartz scheduler is shut down.");
            }

            if (!scheduler.IsStarted || scheduler.InStandbyMode)
            {
                return HealthCheckResult.Degraded("Quartz scheduler is not actively running.");
            }

            return HealthCheckResult.Healthy("Quartz scheduler is running.");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("Quartz scheduler health check failed.", ex);
        }
    }
}
