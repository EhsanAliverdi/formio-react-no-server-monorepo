using Amazon;
using Amazon.Runtime;
using Amazon.S3;
using Microsoft.EntityFrameworkCore;
using SurveyFlow.Infrastructure.Data;
using SurveyFlow.Infrastructure.Services;

namespace SurveyFlow.Api.Extensions;

public static class ServiceExtensions
{
    public static IServiceCollection AddSurveyFlowServices(
        this IServiceCollection services,
        IConfiguration config)
    {
        // AppDbContext with Npgsql
        var connectionString = config["ConnectionStrings:Default"]
            ?? throw new InvalidOperationException("ConnectionStrings:Default is required.");
        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(connectionString));

        // AuthService (scoped)
        services.AddScoped<AuthService>();

        // StorageService (singleton) — creates AmazonS3Client from Minio config
        services.AddSingleton<StorageService>(_ =>
        {
            var endpoint = config["Minio__Endpoint"] ?? "http://localhost:9000";
            var accessKey = config["Minio__AccessKey"] ?? "minioadmin";
            var secretKey = config["Minio__SecretKey"] ?? "minioadmin";
            var bucket = config["Minio__Bucket"] ?? "surveyflow";
            var region = config["Minio__Region"] ?? "us-east-1";

            var s3Config = new AmazonS3Config
            {
                ServiceURL = endpoint,
                ForcePathStyle = true,
                AuthenticationRegion = region
            };

            var credentials = new BasicAWSCredentials(accessKey, secretKey);
            var s3Client = new AmazonS3Client(credentials, s3Config);

            return new StorageService(s3Client, bucket);
        });

        // FormAccessService (scoped)
        services.AddScoped<FormAccessService>();

        // PdfService (singleton)
        services.AddSingleton<PdfService>();

        return services;
    }
}
