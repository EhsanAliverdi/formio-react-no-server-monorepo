namespace HPA.SurveyFlow.Domain.Jobs;

/// <summary>
/// Marker interface for all job parameter types.
/// Parameters are serialised to JSON and passed via Quartz JobDataMap
/// under the key "parameters". Jobs deserialise them to the concrete type they expect.
/// </summary>
public interface IJobParameters { }
