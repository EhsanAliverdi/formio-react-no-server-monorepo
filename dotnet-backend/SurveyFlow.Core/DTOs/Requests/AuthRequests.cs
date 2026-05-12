using System.Text.Json.Serialization;

namespace SurveyFlow.Core.DTOs.Requests;

public class LoginRequest
{
    [JsonPropertyName("email")] public string? Email { get; set; }
    [JsonPropertyName("password")] public string? Password { get; set; }
}
