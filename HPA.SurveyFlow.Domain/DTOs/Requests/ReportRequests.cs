using System.Text.Json;
using System.Text.Json.Serialization;

namespace HPA.SurveyFlow.Domain.DTOs.Requests;

public class ReportColumnDefinitionDto
{
    [JsonPropertyName("field_key")]
    public string FieldKey { get; set; } = null!;

    [JsonPropertyName("label")]
    public string Label { get; set; } = null!;

    [JsonPropertyName("width")]
    public int? Width { get; set; }

    [JsonPropertyName("format")]
    public string? Format { get; set; }
}

public class SaveReportTemplateRequest
{
    [JsonPropertyName("form_id")]
    public int FormId { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = null!;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("is_public")]
    public bool IsPublic { get; set; } = false;

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

    [JsonPropertyName("tags")]
    public List<string> Tags { get; set; } = [];

    [JsonPropertyName("category")]
    public string? Category { get; set; }

    [JsonPropertyName("shared_with_roles")]
    public List<string> SharedWithRoles { get; set; } = [];

    [JsonPropertyName("group_by")]
    public JsonElement? GroupBy { get; set; }

    [JsonPropertyName("measures")]
    public JsonElement? Measures { get; set; }
}

public class SaveRlsPolicyRequest
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = null!;

    [JsonPropertyName("where_fragment")]
    public string WhereFragment { get; set; } = null!;

    [JsonPropertyName("applies_to_roles")]
    public string? AppliestoRoles { get; set; }

    [JsonPropertyName("is_active")]
    public bool IsActive { get; set; } = true;
}

public class RunReportRequest
{
    [JsonPropertyName("template_id")]
    public int TemplateId { get; set; }

    [JsonPropertyName("runtime_filters")]
    public JsonElement? RuntimeFilters { get; set; }

    [JsonPropertyName("sort_field")]
    public string? SortField { get; set; }

    [JsonPropertyName("sort_direction")]
    public string? SortDirection { get; set; }

    [JsonPropertyName("page")]
    public int Page { get; set; } = 1;

    [JsonPropertyName("page_size")]
    public int PageSize { get; set; } = 25;
}
