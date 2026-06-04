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

    /// <summary>True when this field is only shown under a Form.io conditional rule.</summary>
    [JsonPropertyName("is_conditional")]
    public bool IsConditional { get; set; }
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

    [JsonPropertyName("source_type")]
    public string SourceType { get; set; } = "form_submissions";

    [JsonPropertyName("terminal_code")]
    public string? TerminalCode { get; set; }

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

    /// <summary>Per-field drift details when has_schema_drift is true.</summary>
    [JsonPropertyName("field_drift")]
    public List<FieldDriftEntryDto>? FieldDrift { get; set; }

    [JsonPropertyName("tags")]
    public List<string> Tags { get; set; } = [];

    [JsonPropertyName("category")]
    public string? Category { get; set; }

    [JsonPropertyName("shared_with_roles")]
    public List<string> SharedWithRoles { get; set; } = [];

    /// <summary>GROUP BY dimension definitions (null = flat row query).</summary>
    [JsonPropertyName("group_by")]
    public JsonElement? GroupBy { get; set; }

    /// <summary>Measure/aggregation definitions.</summary>
    [JsonPropertyName("measures")]
    public JsonElement? Measures { get; set; }

    /// <summary>True if the user has starred this template as a favourite.</summary>
    [JsonPropertyName("is_favourite")]
    public bool IsFavourite { get; set; }

    /// <summary>Chart type: table | bar | line | pie | doughnut | number_card.</summary>
    [JsonPropertyName("chart_type")]
    public string ChartType { get; set; } = "table";

    /// <summary>Axis-to-alias mapping for the active chart type.</summary>
    [JsonPropertyName("chart_config")]
    public JsonElement? ChartConfig { get; set; }

    /// <summary>Optional Dataset this template sources from (null = direct form query).</summary>
    [JsonPropertyName("dataset_id")]
    public int? DatasetId { get; set; }
}

public class FieldDriftEntryDto
{
    [JsonPropertyName("field_key")]
    public string FieldKey { get; set; } = null!;

    [JsonPropertyName("label")]
    public string Label { get; set; } = null!;

    /// <summary>missing | type_changed | renamed</summary>
    [JsonPropertyName("drift_type")]
    public string DriftType { get; set; } = "missing";

    [JsonPropertyName("message")]
    public string Message { get; set; } = null!;
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
