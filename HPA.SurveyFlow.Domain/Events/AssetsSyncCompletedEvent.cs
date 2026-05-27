namespace HPA.SurveyFlow.Domain.Events;

public record AssetsSyncCompletedEvent(
    string Source,
    int Upserted,
    int Total
) : IEvent;
