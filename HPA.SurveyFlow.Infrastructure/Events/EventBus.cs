using HPA.SurveyFlow.Domain.Events;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace HPA.SurveyFlow.Infrastructure.Events;

/// <summary>
/// In-process event bus backed by the DI container.
/// Resolves all IEventHandler&lt;TEvent&gt; registrations and calls HandleAsync on each.
/// Handlers run sequentially; a failing handler logs the error and does not stop others.
/// No external dependencies — zero license risk.
/// </summary>
public sealed class EventBus(IServiceProvider serviceProvider, ILogger<EventBus> logger) : IEventBus
{
    public async Task PublishAsync<TEvent>(TEvent @event, CancellationToken ct = default)
        where TEvent : IEvent
    {
        var handlers = serviceProvider.GetServices<IEventHandler<TEvent>>();
        foreach (var handler in handlers)
        {
            try
            {
                await handler.HandleAsync(@event, ct);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "EventBus: handler {Handler} threw for event {Event}",
                    handler.GetType().Name, typeof(TEvent).Name);
            }
        }
    }
}
