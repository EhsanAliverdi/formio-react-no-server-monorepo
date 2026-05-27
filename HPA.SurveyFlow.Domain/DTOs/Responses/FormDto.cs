using System.Text.Json.Serialization;

namespace HPA.SurveyFlow.Domain.DTOs.Responses;

public class FormDto
{
    [JsonPropertyName("id")] public int Id { get; set; }
    [JsonPropertyName("name")] public string Name { get; set; } = null!;
    [JsonPropertyName("json")] public object Json { get; set; } = null!;
    [JsonPropertyName("allow_anonymous_submit")] public int AllowAnonymousSubmit { get; set; }
    [JsonPropertyName("visibility")] public string Visibility { get; set; } = null!;
    [JsonPropertyName("parent_form_id")] public int? ParentFormId { get; set; }
    [JsonPropertyName("allowed_roles")] public List<string>? AllowedRoles { get; set; }
    [JsonPropertyName("allowed_user_ids")] public List<int>? AllowedUserIds { get; set; }
}
