namespace HPA.SurveyFlow.Domain.Events;

/// <summary>Handles a specific domain event type.</summary>
public interface IEventHandler<in TEvent> where TEvent : IEvent
{
    Task HandleAsync(TEvent @event, CancellationToken ct = default);
}
