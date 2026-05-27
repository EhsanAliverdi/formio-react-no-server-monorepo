using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace HPA.SurveyFlow.Api.Health;

public sealed record ObjectStorageHealthOptions(string Bucket);

public sealed class ObjectStorageHealthCheck(
    IAmazonS3 s3,
    ObjectStorageHealthOptions options) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await s3.ListObjectsV2Async(new ListObjectsV2Request
            {
                BucketName = options.Bucket,
                MaxKeys = 1
            }, cancellationToken);

            return HealthCheckResult.Healthy("Object storage is reachable.");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("Object storage health check failed.", ex);
        }
    }
}
