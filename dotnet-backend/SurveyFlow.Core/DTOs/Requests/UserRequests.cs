using System.Text.Json.Serialization;

namespace SurveyFlow.Core.DTOs.Requests;

public class CreateUserRequest
{
    [JsonPropertyName("email")] public string? Email { get; set; }
    [JsonPropertyName("password")] public string? Password { get; set; }
    [JsonPropertyName("role")] public string? Role { get; set; }
    [JsonPropertyName("is_active")] public object? IsActive { get; set; }
    [JsonPropertyName("display_name")] public string? DisplayName { get; set; }
    [JsonPropertyName("preferred_name")] public string? PreferredName { get; set; }
    [JsonPropertyName("first_name")] public string? FirstName { get; set; }
    [JsonPropertyName("middle_name")] public string? MiddleName { get; set; }
    [JsonPropertyName("last_name")] public string? LastName { get; set; }
    [JsonPropertyName("pronouns")] public string? Pronouns { get; set; }
    [JsonPropertyName("date_of_birth")] public string? DateOfBirth { get; set; }
    [JsonPropertyName("phone")] public string? Phone { get; set; }
    [JsonPropertyName("job_title")] public string? JobTitle { get; set; }
    [JsonPropertyName("department")] public string? Department { get; set; }
    [JsonPropertyName("company")] public string? Company { get; set; }
    [JsonPropertyName("website_url")] public string? WebsiteUrl { get; set; }
    [JsonPropertyName("bio")] public string? Bio { get; set; }
    [JsonPropertyName("address_line1")] public string? AddressLine1 { get; set; }
    [JsonPropertyName("address_line2")] public string? AddressLine2 { get; set; }
    [JsonPropertyName("city")] public string? City { get; set; }
    [JsonPropertyName("state")] public string? State { get; set; }
    [JsonPropertyName("postal_code")] public string? PostalCode { get; set; }
    [JsonPropertyName("country")] public string? Country { get; set; }
    [JsonPropertyName("timezone")] public string? Timezone { get; set; }
    [JsonPropertyName("locale")] public string? Locale { get; set; }
}

public class UpdateUserRequest : CreateUserRequest { }

public class UpdateProfileRequest
{
    [JsonPropertyName("display_name")] public string? DisplayName { get; set; }
    [JsonPropertyName("preferred_name")] public string? PreferredName { get; set; }
    [JsonPropertyName("first_name")] public string? FirstName { get; set; }
    [JsonPropertyName("middle_name")] public string? MiddleName { get; set; }
    [JsonPropertyName("last_name")] public string? LastName { get; set; }
    [JsonPropertyName("pronouns")] public string? Pronouns { get; set; }
    [JsonPropertyName("date_of_birth")] public string? DateOfBirth { get; set; }
    [JsonPropertyName("phone")] public string? Phone { get; set; }
    [JsonPropertyName("job_title")] public string? JobTitle { get; set; }
    [JsonPropertyName("department")] public string? Department { get; set; }
    [JsonPropertyName("company")] public string? Company { get; set; }
    [JsonPropertyName("website_url")] public string? WebsiteUrl { get; set; }
    [JsonPropertyName("bio")] public string? Bio { get; set; }
    [JsonPropertyName("address_line1")] public string? AddressLine1 { get; set; }
    [JsonPropertyName("address_line2")] public string? AddressLine2 { get; set; }
    [JsonPropertyName("city")] public string? City { get; set; }
    [JsonPropertyName("state")] public string? State { get; set; }
    [JsonPropertyName("postal_code")] public string? PostalCode { get; set; }
    [JsonPropertyName("country")] public string? Country { get; set; }
    [JsonPropertyName("timezone")] public string? Timezone { get; set; }
    [JsonPropertyName("locale")] public string? Locale { get; set; }
}
