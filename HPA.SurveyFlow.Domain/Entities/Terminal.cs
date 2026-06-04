namespace HPA.SurveyFlow.Domain.Entities;

public class Terminal
{
    public string Code { get; set; } = null!;
    public string Description { get; set; } = null!;
    public string Timezone { get; set; } = null!;
    public string PortCode { get; set; } = null!;
    public string TradingName { get; set; } = null!;
}
