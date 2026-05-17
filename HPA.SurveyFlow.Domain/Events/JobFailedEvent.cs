namespace HPA.SurveyFlow.Domain.Events;

public record JobFailedEvent(
    string JobKey,
    string ErrorMessage
) : IEvent;
