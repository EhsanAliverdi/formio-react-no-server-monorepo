namespace HPA.SurveyFlow.Domain.Events;

/// <summary>
/// In-process event bus. Resolves all registered IEventHandler&lt;TEvent&gt; from DI
/// and invokes them in parallel. Fire-and-forget style — exceptions are caught per handler.
/// </summary>
public interface IEventBus
{
    Task PublishAsync<TEvent>(TEvent @event, CancellationToken ct = default) where TEvent : IEvent;
}
