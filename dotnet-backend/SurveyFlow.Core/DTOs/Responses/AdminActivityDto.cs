using System.Text.Json.Serialization;

namespace SurveyFlow.Core.DTOs.Responses;

public class AdminActivityDto
{
    [JsonPropertyName("id")] public string Id { get; set; } = null!;
    [JsonPropertyName("type")] public string Type { get; set; } = null!;
    [JsonPropertyName("occurred_at")] public DateTime OccurredAt { get; set; }
    [JsonPropertyName("title")] public string Title { get; set; } = null!;
    [JsonPropertyName("summary")] public string Summary { get; set; } = null!;
    [JsonPropertyName("actor")] public ActivityActorDto? Actor { get; set; }
    [JsonPropertyName("entity")] public ActivityEntityDto? Entity { get; set; }
    [JsonPropertyName("link")] public string? Link { get; set; }
    [JsonPropertyName("details")] public object? Details { get; set; }
}

public class ActivityActorDto
{
    [JsonPropertyName("id")] public int Id { get; set; }
    [JsonPropertyName("email")] public string Email { get; set; } = null!;
    [JsonPropertyName("display_name")] public string? DisplayName { get; set; }
    [JsonPropertyName("avatar_url")] public string? AvatarUrl { get; set; }
}

public class ActivityEntityDto
{
    [JsonPropertyName("kind")] public string Kind { get; set; } = null!;
    [JsonPropertyName("id")] public int Id { get; set; }
    [JsonPropertyName("form_id")] public int? FormId { get; set; }
}
