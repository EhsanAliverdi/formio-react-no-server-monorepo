using System.Text.Json;
using System.Text.Json.Serialization;

namespace HPA.SurveyFlow.Domain.DTOs.Requests;

public class CreateFormRequest
{
    [JsonPropertyName("name")] public string? Name { get; set; }
    [JsonPropertyName("json")] public JsonElement? Json { get; set; }
    [JsonPropertyName("allow_anonymous_submit")] public object? AllowAnonymousSubmit { get; set; }
    [JsonPropertyName("visibility")] public string? Visibility { get; set; }
    [JsonPropertyName("parent_form_id")] public int? ParentFormId { get; set; }
    [JsonPropertyName("terminal_code")] public string? TerminalCode { get; set; }
    [JsonPropertyName("allowed_roles")] public List<string>? AllowedRoles { get; set; }
    [JsonPropertyName("allowed_user_ids")] public List<int>? AllowedUserIds { get; set; }
}

public class UpdateFormRequest
{
    [JsonPropertyName("name")] public string? Name { get; set; }
    [JsonPropertyName("json")] public JsonElement? Json { get; set; }
    [JsonPropertyName("allow_anonymous_submit")] public object? AllowAnonymousSubmit { get; set; }
    [JsonPropertyName("visibility")] public string? Visibility { get; set; }
    [JsonPropertyName("parent_form_id")] public int? ParentFormId { get; set; }
    [JsonPropertyName("terminal_code")] public string? TerminalCode { get; set; }
    [JsonPropertyName("allowed_roles")] public List<string>? AllowedRoles { get; set; }
    [JsonPropertyName("allowed_user_ids")] public List<int>? AllowedUserIds { get; set; }
}

public class SubmitFormRequest
{
    [JsonPropertyName("data")] public JsonElement? Data { get; set; }
    [JsonPropertyName("parent_submission_id")] public int? ParentSubmissionId { get; set; }
    [JsonPropertyName("terminal_code")] public string? TerminalCode { get; set; }
}
