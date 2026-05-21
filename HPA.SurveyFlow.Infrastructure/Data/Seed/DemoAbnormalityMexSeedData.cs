using System.Text.Json;

namespace HPA.SurveyFlow.Infrastructure.Data.Seed;

/// <summary>
/// Demo form for outcome-specific abnormalities:
///   - Yes = normal
///   - No = error
///   - I don't know = warning
///   - Secondary submit to MEX is enabled for success, warning, and error outcomes.
/// </summary>
internal static class DemoAbnormalityMexSeedData
{
    public const string FormName = "Abnormality Outcome to MEX (Demo)";

    public static SeedForm Create()
    {
        var schema = new
        {
            display = "form",
            title = FormName,
            appSettings = new
            {
                publicDescription = "Demonstrates normal, warning, and error answer rules with MEX secondary submit.",
                previewBeforeSubmit = true,
                allowSubmissionPdfExport = true,
                messageOnSuccess = "Submitted successfully. The answer was normal.",
                messageOnWarning = "Submitted with a warning. Maintenance will review the uncertainty.",
                messageOnError = "Submitted with an error. Maintenance has been notified.",
                secondarySubmit = new
                {
                    success = new { enabled = true, integration = "mex", action = "create_request" },
                    warning = new { enabled = true, integration = "mex", action = "create_request" },
                    error = new { enabled = true, integration = "mex", action = "create_request" },
                },
            },
            components = new object[]
            {
                new
                {
                    type = "radio",
                    key = "equipmentReady",
                    label = "Is the equipment ready and safe to operate?",
                    input = true,
                    validate = new { required = true },
                    values = new[]
                    {
                        new { label = "Yes", value = "yes" },
                        new { label = "No", value = "no" },
                        new { label = "I don't know", value = "dont_know" },
                    },
                    properties = new
                    {
                        abnormal_enabled = true,
                        abnormal_normal_values = new[] { new { value = "yes" } },
                        abnormal_error_values = new[] { new { value = "no" } },
                        abnormal_warning_values = new[] { new { value = "dont_know" } },
                        abnormal_default_level = "none",
                    },
                },
                new
                {
                    type = "textfield",
                    key = "jobTypeName",
                    label = "MEX Job Type Name",
                    input = true,
                    placeholder = "Inspection",
                },
                new
                {
                    type = "textarea",
                    key = "description",
                    label = "Request description",
                    input = true,
                    validate = new { required = true },
                    placeholder = "Describe what maintenance should know.",
                },
            },
        };

        var json = JsonSerializer.SerializeToElement(schema, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        return new SeedForm(FormName, json);
    }
}
