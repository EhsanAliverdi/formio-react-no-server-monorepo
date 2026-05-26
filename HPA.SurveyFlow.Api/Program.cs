using Amazon.S3;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi;
using Quartz;
using Scalar.AspNetCore;
using Serilog;
using HPA.SurveyFlow.Api.Authentication;
using HPA.SurveyFlow.Api.Authorization;
using HPA.SurveyFlow.Api.Middleware;
using HPA.SurveyFlow.Infrastructure.Data;
using HPA.SurveyFlow.Infrastructure.Data.Seed;
using HPA.SurveyFlow.Domain.Events;
using HPA.SurveyFlow.Infrastructure.Events;
using HPA.SurveyFlow.Infrastructure.Jobs.Handlers;
using HPA.SurveyFlow.Infrastructure.Jobs.Scheduling;
using HPA.SurveyFlow.Infrastructure.Services;
using System.Text.Json;
using System.Text.Json.Serialization;

// Bootstrap Serilog from appsettings before the host is built so startup errors are captured.
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(new ConfigurationBuilder()
        .AddJsonFile("appsettings.json", optional: false)
        .AddJsonFile($"appsettings.{Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production"}.json", optional: true)
        .AddEnvironmentVariables()
        .Build())
    .Enrich.FromLogContext()
    .CreateBootstrapLogger();

var builder = WebApplication.CreateBuilder(args);

// Replace default logging with Serilog
builder.Host.UseSerilog((ctx, services, cfg) =>
    cfg.ReadFrom.Configuration(ctx.Configuration)
       .ReadFrom.Services(services)
       .Enrich.FromLogContext());

// Controllers with JSON options (snake_case handled via [JsonPropertyName] attributes)
builder.Services.AddControllers()
    .AddJsonOptions(opts =>
    {
        opts.JsonSerializerOptions.PropertyNamingPolicy = null;
        opts.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.Never;
    });

builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer((document, _, _) =>
    {
        document.Components ??= new OpenApiComponents();
        document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();
        document.Components.SecuritySchemes[SessionBearerAuthenticationHandler.SchemeName] = new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            In = ParameterLocation.Header,
            Name = "Authorization",
            Description = "Enter a bearer token as: Bearer {token}",
        };

        document.Security ??= new List<OpenApiSecurityRequirement>();
        document.Security.Add(new OpenApiSecurityRequirement
        {
            [new OpenApiSecuritySchemeReference(SessionBearerAuthenticationHandler.SchemeName, document, null)] = []
        });

        return Task.CompletedTask;
    });
});

builder.Services
    .AddAuthentication(SessionBearerAuthenticationHandler.SchemeName)
    .AddScheme<AuthenticationSchemeOptions, SessionBearerAuthenticationHandler>(
        SessionBearerAuthenticationHandler.SchemeName,
        _ => { });
builder.Services.AddAuthorization();
builder.Services.AddSingleton<IAuthorizationPolicyProvider, PermissionPolicyProvider>();
builder.Services.AddSingleton<IAuthorizationHandler, PermissionAuthorizationHandler>();

// Database
var connStr = builder.Configuration.GetConnectionString("Default")
    ?? Environment.GetEnvironmentVariable("DATABASE_URL")
    ?? throw new InvalidOperationException("No database connection string.");

builder.Services.AddDbContext<AppDbContext>(opts =>
    opts.UseNpgsql(connStr));

// MinIO / S3
var minioEndpoint = builder.Configuration["Minio:Endpoint"]
    ?? Environment.GetEnvironmentVariable("MINIO_ENDPOINT") ?? "http://localhost:9000";
var minioAccessKey = builder.Configuration["Minio:AccessKey"]
    ?? Environment.GetEnvironmentVariable("MINIO_ACCESS_KEY")
    ?? Environment.GetEnvironmentVariable("MINIO_ROOT_USER") ?? "minioadmin";
var minioSecretKey = builder.Configuration["Minio:SecretKey"]
    ?? Environment.GetEnvironmentVariable("MINIO_SECRET_KEY")
    ?? Environment.GetEnvironmentVariable("MINIO_ROOT_PASSWORD") ?? "minioadmin";
var minioBucket = builder.Configuration["Minio:Bucket"]
    ?? Environment.GetEnvironmentVariable("MINIO_BUCKET") ?? "uploads";
var minioRegion = builder.Configuration["Minio:Region"]
    ?? Environment.GetEnvironmentVariable("MINIO_REGION") ?? "us-east-1";

var s3Config = new AmazonS3Config { ServiceURL = minioEndpoint, ForcePathStyle = true, AuthenticationRegion = minioRegion };
var s3Client = new AmazonS3Client(minioAccessKey, minioSecretKey, s3Config);
builder.Services.AddSingleton<IAmazonS3>(s3Client);
builder.Services.AddSingleton(sp => new StorageService(sp.GetRequiredService<IAmazonS3>(), minioBucket));

// App services
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<FormAccessService>();
builder.Services.AddSingleton<SecondarySubmitService>();
builder.Services.AddSingleton<PdfService>();

// ── Event Bus (in-process, zero dependencies) ──────────────────────────────
builder.Services.AddScoped<IEventBus, EventBus>();
// Register all event handlers — each handler can implement multiple IEventHandler<T>
builder.Services.AddScoped<LogJobRunHandler>();
builder.Services.AddScoped<IEventHandler<JobStartedEvent>>(sp => sp.GetRequiredService<LogJobRunHandler>());
builder.Services.AddScoped<IEventHandler<JobCompletedEvent>>(sp => sp.GetRequiredService<LogJobRunHandler>());
builder.Services.AddScoped<IEventHandler<JobFailedEvent>>(sp => sp.GetRequiredService<LogJobRunHandler>());

// ── Quartz ─────────────────────────────────────────────────────────────────
builder.Services.AddQuartz(q =>
{
    // Jobs are created by our DI-aware factory — no additional config needed here.
    // Actual job/trigger registration happens in JobScheduler.ApplyAsync() at startup.
    q.UseDefaultThreadPool(tp => tp.MaxConcurrency = 5);
});
builder.Services.AddQuartzHostedService(opts =>
{
    opts.WaitForJobsToComplete = true;
    opts.StartDelay = TimeSpan.FromSeconds(5); // let the app fully start before first tick
});

// JobScheduler is transient so it always gets a fresh DbContext + Scheduler
builder.Services.AddTransient<JobScheduler>();

// CORS — allow all origins
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));

var app = builder.Build();

// ── Startup: migrate, seed, schedule jobs ──────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var seedAdminUser        = GetFlag(builder.Configuration, "Seed:AdminUser",        "SEED_ADMIN_USER",        false);
    var seedForms            = GetFlag(builder.Configuration, "Seed:Forms",            "SEED_FORMS",            false);
    var seedOverrideExisting = GetFlag(builder.Configuration, "Seed:OverrideExisting", "SEED_OVERRIDE_EXISTING", false);
    var adminEmail    = builder.Configuration["Admin:Email"] ?? Environment.GetEnvironmentVariable("ADMIN_EMAIL");
    var adminPassword = builder.Configuration["Admin:Password"] ?? Environment.GetEnvironmentVariable("ADMIN_PASSWORD");

    var storage = app.Services.GetRequiredService<StorageService>();
    await storage.EnsureBucketAsync();
    await DbSeeder.SeedAsync(db, seedAdminUser, adminEmail, adminPassword, seedForms, seedOverrideExisting, storage);

    // Apply job schedules from the DB after seeding has run
    var jobScheduler = scope.ServiceProvider.GetRequiredService<JobScheduler>();
    await jobScheduler.ApplyAsync();
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.UseCors();

// Correlation ID must be first so all subsequent middleware + logs carry it
app.UseMiddleware<CorrelationIdMiddleware>();

// Serilog request logging — logs method, path, status, elapsed in one structured line
app.UseSerilogRequestLogging(opts =>
{
    opts.EnrichDiagnosticContext = (diag, ctx) =>
    {
        diag.Set("UserEmail", ctx.Items["CurrentUser"] is HPA.SurveyFlow.Domain.Entities.User u ? u.Email : null);
        diag.Set("CorrelationId", ctx.Items["CorrelationId"]);
    };
});

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

try
{
    app.Run();
}
finally
{
    Log.CloseAndFlush();
}

static bool GetFlag(IConfiguration configuration, string configKey, string envVar, bool defaultValue)
{
    var raw = configuration[configKey] ?? Environment.GetEnvironmentVariable(envVar);
    if (string.IsNullOrWhiteSpace(raw)) return defaultValue;
    return bool.TryParse(raw, out var flag)
        ? flag
        : throw new InvalidOperationException($"{configKey} must be true or false.");
}
