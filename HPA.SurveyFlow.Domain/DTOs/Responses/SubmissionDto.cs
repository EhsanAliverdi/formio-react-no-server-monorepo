using System.Text.Json.Serialization;

namespace HPA.SurveyFlow.Domain.DTOs.Responses;

public class AbnormalityDto
{
    [JsonPropertyName("key")] public string Key { get; set; } = null!;
    [JsonPropertyName("type")] public string? Type { get; set; }
    [JsonPropertyName("label")] public string? Label { get; set; }
    [JsonPropertyName("normal_value")] public object? NormalValue { get; set; }
    [JsonPropertyName("level")] public string Level { get; set; } = "error";
}

public class SubmissionListItemDto
{
    [JsonPropertyName("id")] public int Id { get; set; }
    [JsonPropertyName("form_id")] public int FormId { get; set; }
    [JsonPropertyName("form_name")] public string FormName { get; set; } = null!;
    [JsonPropertyName("submitted_at")] public DateTime SubmittedAt { get; set; }
    [JsonPropertyName("can_export_pdf")] public bool CanExportPdf { get; set; }
}

public class SubmissionDetailDto
{
    [JsonPropertyName("id")] public int Id { get; set; }
    [JsonPropertyName("form_id")] public int FormId { get; set; }
    [JsonPropertyName("form_name")] public string FormName { get; set; } = null!;
    [JsonPropertyName("user_id")] public int? UserId { get; set; }
    [JsonPropertyName("user_email")] public string? UserEmail { get; set; }
    [JsonPropertyName("submitted_at")] public DateTime SubmittedAt { get; set; }
    [JsonPropertyName("updated_at")] public DateTime? UpdatedAt { get; set; }
    [JsonPropertyName("form")] public object? Form { get; set; }
    [JsonPropertyName("data")] public object? Data { get; set; }
    [JsonPropertyName("can_export_pdf")] public bool CanExportPdf { get; set; }
}

public class AdminSubmissionListItemDto
{
    [JsonPropertyName("id")] public int Id { get; set; }
    [JsonPropertyName("form_id")] public int FormId { get; set; }
    [JsonPropertyName("form_name")] public string FormName { get; set; } = null!;
    [JsonPropertyName("user_id")] public int? UserId { get; set; }
    [JsonPropertyName("user_email")] public string? UserEmail { get; set; }
    [JsonPropertyName("submitted_at")] public DateTime SubmittedAt { get; set; }
    [JsonPropertyName("has_abnormalities")] public bool HasAbnormalities { get; set; }
    [JsonPropertyName("error_count")] public int ErrorCount { get; set; }
    [JsonPropertyName("warning_count")] public int WarningCount { get; set; }
    [JsonPropertyName("secondary_submit_status")] public string? SecondarySubmitStatus { get; set; }
}

public class AdminSubmissionDetailDto
{
    [JsonPropertyName("id")] public int Id { get; set; }
    [JsonPropertyName("form_id")] public int FormId { get; set; }
    [JsonPropertyName("form_name")] public string FormName { get; set; } = null!;
    [JsonPropertyName("user_id")] public int? UserId { get; set; }
    [JsonPropertyName("user_email")] public string? UserEmail { get; set; }
    [JsonPropertyName("submitted_at")] public DateTime SubmittedAt { get; set; }
    [JsonPropertyName("updated_at")] public DateTime? UpdatedAt { get; set; }
    [JsonPropertyName("updated_by")] public int? UpdatedBy { get; set; }
    [JsonPropertyName("updated_by_email")] public string? UpdatedByEmail { get; set; }
    [JsonPropertyName("edit_history")] public object? EditHistory { get; set; }
    [JsonPropertyName("form")] public object? Form { get; set; }
    [JsonPropertyName("data")] public object? Data { get; set; }
    [JsonPropertyName("has_abnormalities")] public bool HasAbnormalities { get; set; }
    [JsonPropertyName("error_count")] public int ErrorCount { get; set; }
    [JsonPropertyName("warning_count")] public int WarningCount { get; set; }
    [JsonPropertyName("abnormalities")] public List<AbnormalityDto> Abnormalities { get; set; } = [];
    [JsonPropertyName("secondary_submit_status")] public string? SecondarySubmitStatus { get; set; }
    [JsonPropertyName("secondary_submit_response")] public object? SecondarySubmitResponse { get; set; }
    [JsonPropertyName("secondary_submit_at")] public DateTime? SecondarySubmitAt { get; set; }
}
