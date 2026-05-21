using System.Text.Json;

namespace HPA.SurveyFlow.Infrastructure.Data.Seed;

internal static class DemoSubFormSeedData
{
    public const string ParentFormName = "Sub Form Redirect Parent (Demo)";
    public const string AcknowledgementFormName = "Acknowledgement Sub Form (Demo)";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public static SeedForm CreateParent(int? acknowledgementFormId = null)
    {
        var schema = new
        {
            display = "form",
            title = ParentFormName,
            appSettings = new
            {
                publicDescription = "Submit Yes, No, or I don't know to demonstrate outcome-based sub-form navigation.",
                messageOnSuccess = "Normal answer received. Opening acknowledgement form.",
                messageOnWarning = "Warning answer received. Opening acknowledgement form.",
                messageOnError = "Error answer received. Opening acknowledgement form.",
                nextForms = new
                {
                    success = acknowledgementFormId,
                    warning = acknowledgementFormId,
                    error = acknowledgementFormId,
                },
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
                    key = "readyStatus",
                    label = "Is this request ready to proceed?",
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
                    type = "textarea",
                    key = "description",
                    label = "Details for MEX request",
                    input = true,
                    validate = new { required = true },
                },
            },
        };

        return new SeedForm(ParentFormName, JsonSerializer.SerializeToElement(schema, JsonOptions));
    }

    public static SeedForm CreateAcknowledgement()
    {
        var schema = new
        {
            display = "form",
            title = AcknowledgementFormName,
            appSettings = new
            {
                publicDescription = "Follow-up acknowledgement form shown after the parent demo submission.",
                messageOnSuccess = "Acknowledgement submitted and linked to the parent submission.",
            },
            components = new object[]
            {
                new
                {
                    type = "textarea",
                    key = "acknowledgement",
                    label = "Acknowledgement",
                    input = true,
                    validate = new { required = true },
                    placeholder = "Confirm what action you will take next.",
                },
            },
        };

        return new SeedForm(AcknowledgementFormName, JsonSerializer.SerializeToElement(schema, JsonOptions));
    }
}
