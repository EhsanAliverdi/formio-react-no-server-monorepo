using System.Text.Json.Serialization;

namespace HPA.SurveyFlow.Domain.DTOs.Responses;

public class TerminalDto
{
    [JsonPropertyName("code")] public string Code { get; set; } = null!;
    [JsonPropertyName("description")] public string Description { get; set; } = null!;
    [JsonPropertyName("timezone")] public string Timezone { get; set; } = null!;
    [JsonPropertyName("port_code")] public string PortCode { get; set; } = null!;
    [JsonPropertyName("trading_name")] public string TradingName { get; set; } = null!;
}
