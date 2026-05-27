using System.Text.Json;
using HPA.SurveyFlow.Domain.Jobs;
using Quartz;

namespace HPA.SurveyFlow.Infrastructure.Jobs.Abstractions;

/// <summary>
/// Reads typed job parameters from the Quartz JobDataMap.
///
/// Convention: parameters are serialised as a single JSON string under the key "parameters".
/// This keeps the JobDataMap clean and makes the pattern generic across all job types.
///
/// Usage in a job:
///   var p = JobParameterContext.Get&lt;DateRangeJobParameters&gt;(context);
///   // p is null if no parameters were provided (scheduled run)
/// </summary>
public static class JobParameterContext
{
    public const string ParametersKey = "parameters";

    /// <summary>
    /// Deserialises the parameters JSON from the job data map.
    /// Returns null if no parameters were provided (e.g. scheduled cron run).
    /// </summary>
    public static T? Get<T>(IJobExecutionContext context) where T : class, IJobParameters
    {
        var map = context.MergedJobDataMap;
        if (!map.ContainsKey(ParametersKey)) return null;

        var json = map.GetString(ParametersKey);
        if (string.IsNullOrWhiteSpace(json)) return null;

        return JsonSerializer.Deserialize<T>(json,
            new JsonSerializerOptions(JsonSerializerDefaults.Web));
    }

    /// <summary>
    /// Serialises parameters to JSON for use in a JobDataMap.
    /// </summary>
    public static string Serialise<T>(T parameters) where T : IJobParameters =>
        JsonSerializer.Serialize(parameters, new JsonSerializerOptions(JsonSerializerDefaults.Web));
}
