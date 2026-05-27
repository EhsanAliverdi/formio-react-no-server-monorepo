namespace HPA.SurveyFlow.Domain.Events;

public record JobStartedEvent(
    string JobKey,
    string DisplayName,
    string TriggerType,
    string? TriggeredByEmail
) : IEvent;
