namespace HPA.SurveyFlow.Domain.Events;

public record JobCompletedEvent(
    string JobKey,
    string ResultSummary
) : IEvent;
