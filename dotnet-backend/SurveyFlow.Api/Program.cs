using Amazon.S3;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;
using SurveyFlow.Infrastructure.Data;
using SurveyFlow.Infrastructure.Data.Seed;
using SurveyFlow.Infrastructure.Services;
using System.Text.Json;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// Controllers with JSON options (snake_case handled via [JsonPropertyName] attributes)
builder.Services.AddControllers()
    .AddJsonOptions(opts =>
    {
        opts.JsonSerializerOptions.PropertyNamingPolicy = null; // rely on [JsonPropertyName]
        opts.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.Never;
    });

builder.Services.AddOpenApi();

// Database
var connStr = builder.Configuration.GetConnectionString("Default")
    ?? Environment.GetEnvironmentVariable("DATABASE_URL")
    ?? throw new InvalidOperationException("No database connection string.");

builder.Services.AddDbContext<AppDbContext>(opts =>
    opts.UseNpgsql(connStr));

// MinIO / S3
var minioEndpoint = builder.Configuration["Minio:Endpoint"]
    ?? Environment.GetEnvironmentVariable("MINIO_ENDPOINT")
    ?? "http://localhost:9000";
var minioAccessKey = builder.Configuration["Minio:AccessKey"]
    ?? Environment.GetEnvironmentVariable("MINIO_ACCESS_KEY")
    ?? Environment.GetEnvironmentVariable("MINIO_ROOT_USER")
    ?? "minioadmin";
var minioSecretKey = builder.Configuration["Minio:SecretKey"]
    ?? Environment.GetEnvironmentVariable("MINIO_SECRET_KEY")
    ?? Environment.GetEnvironmentVariable("MINIO_ROOT_PASSWORD")
    ?? "minioadmin";
var minioBucket = builder.Configuration["Minio:Bucket"]
    ?? Environment.GetEnvironmentVariable("MINIO_BUCKET")
    ?? "uploads";
var minioRegion = builder.Configuration["Minio:Region"]
    ?? Environment.GetEnvironmentVariable("MINIO_REGION")
    ?? "us-east-1";

var s3Config = new AmazonS3Config
{
    ServiceURL = minioEndpoint,
    ForcePathStyle = true,
    AuthenticationRegion = minioRegion,
};
var s3Client = new AmazonS3Client(minioAccessKey, minioSecretKey, s3Config);
builder.Services.AddSingleton<IAmazonS3>(s3Client);
builder.Services.AddSingleton(sp => new StorageService(sp.GetRequiredService<IAmazonS3>(), minioBucket));

// App services
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<FormAccessService>();
builder.Services.AddSingleton<PdfService>();

// CORS — allow all origins (matches Next.js behaviour)
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader());
});

var app = builder.Build();

// Ensure DB migrated and seeded
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var superuserEmail = builder.Configuration["Superuser:Email"]
        ?? Environment.GetEnvironmentVariable("SUPERUSER_EMAIL")
        ?? "admin@example.com";
    var superuserPassword = builder.Configuration["Superuser:Password"]
        ?? Environment.GetEnvironmentVariable("SUPERUSER_PASSWORD")
        ?? "admin12345";
    var storage = app.Services.GetRequiredService<StorageService>();
    await storage.EnsureBucketAsync();
    await DbSeeder.SeedAsync(db, superuserEmail, superuserPassword);
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.UseCors();

// Auth middleware — populates HttpContext.Items["CurrentUser"]
app.UseMiddleware<SurveyFlow.Api.Middleware.SessionAuthMiddleware>();

app.UseAuthorization();
app.MapControllers();

app.Run();
