using System.Text.Json.Serialization;

namespace SurveyFlow.Core.DTOs.Responses;

public class NotificationDto
{
    [JsonPropertyName("id")] public int Id { get; set; }
    [JsonPropertyName("title")] public string Title { get; set; } = null!;
    [JsonPropertyName("body")] public string Body { get; set; } = null!;
    [JsonPropertyName("level")] public string Level { get; set; } = null!;
    [JsonPropertyName("created_at")] public DateTime CreatedAt { get; set; }
    [JsonPropertyName("created_by")] public int? CreatedBy { get; set; }
    [JsonPropertyName("created_by_email")] public string? CreatedByEmail { get; set; }
    [JsonPropertyName("created_by_avatar_url")] public string? CreatedByAvatarUrl { get; set; }
    [JsonPropertyName("delivered_at")] public DateTime DeliveredAt { get; set; }
    [JsonPropertyName("read_at")] public DateTime? ReadAt { get; set; }
}

public class AdminNotificationDto
{
    [JsonPropertyName("id")] public int Id { get; set; }
    [JsonPropertyName("title")] public string Title { get; set; } = null!;
    [JsonPropertyName("body")] public string Body { get; set; } = null!;
    [JsonPropertyName("level")] public string Level { get; set; } = null!;
    [JsonPropertyName("created_at")] public DateTime CreatedAt { get; set; }
    [JsonPropertyName("created_by")] public int? CreatedBy { get; set; }
    [JsonPropertyName("created_by_email")] public string? CreatedByEmail { get; set; }
    [JsonPropertyName("created_by_avatar_url")] public string? CreatedByAvatarUrl { get; set; }
    [JsonPropertyName("recipient_count")] public int RecipientCount { get; set; }
    [JsonPropertyName("read_count")] public int ReadCount { get; set; }
}
