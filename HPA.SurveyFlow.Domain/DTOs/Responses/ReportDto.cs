using System.Text.Json;
using System.Text.Json.Serialization;
using HPA.SurveyFlow.Domain.DTOs.Requests;

namespace HPA.SurveyFlow.Domain.DTOs.Responses;

public class FieldDescriptorDto
{
    [JsonPropertyName("key")]
    public string Key { get; set; } = null!;

    [JsonPropertyName("label")]
    public string Label { get; set; } = null!;

    [JsonPropertyName("type")]
    public string Type { get; set; } = "text";

    [JsonPropertyName("options")]
    public List<FieldOptionDto>? Options { get; set; }
}

public class FieldOptionDto
{
    [JsonPropertyName("value")]
    public string Value { get; set; } = null!;

    [JsonPropertyName("label")]
    public string Label { get; set; } = null!;
}

public class ReportTemplateDto
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("form_id")]
    public int FormId { get; set; }

    [JsonPropertyName("form_name")]
    public string FormName { get; set; } = null!;

    [JsonPropertyName("name")]
    public string Name { get; set; } = null!;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("is_public")]
    public bool IsPublic { get; set; }

    [JsonPropertyName("created_by")]
    public int CreatedBy { get; set; }

    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updated_at")]
    public DateTime UpdatedAt { get; set; }

    [JsonPropertyName("columns")]
    public List<ReportColumnDefinitionDto> Columns { get; set; } = [];

    [JsonPropertyName("filters")]
    public JsonElement? Filters { get; set; }

    [JsonPropertyName("default_sort_field")]
    public string? DefaultSortField { get; set; }

    [JsonPropertyName("default_sort_direction")]
    public string DefaultSortDirection { get; set; } = "asc";

    [JsonPropertyName("default_page_size")]
    public int DefaultPageSize { get; set; } = 25;

    [JsonPropertyName("display_mode")]
    public string DisplayMode { get; set; } = "table";

    [JsonPropertyName("has_schema_drift")]
    public bool HasSchemaDrift { get; set; }
}

public class ReportExecutionResultDto
{
    [JsonPropertyName("columns")]
    public List<ReportColumnDefinitionDto> Columns { get; set; } = [];

    [JsonPropertyName("rows")]
    public List<Dictionary<string, object?>> Rows { get; set; } = [];

    [JsonPropertyName("total")]
    public int Total { get; set; }

    [JsonPropertyName("page")]
    public int Page { get; set; }

    [JsonPropertyName("page_size")]
    public int PageSize { get; set; }
}
