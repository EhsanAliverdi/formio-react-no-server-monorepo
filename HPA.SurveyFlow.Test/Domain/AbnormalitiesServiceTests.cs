using System.Text.Json;
using HPA.SurveyFlow.Infrastructure.Services;

namespace HPA.SurveyFlow.Test.Domain;

public class AbnormalitiesServiceTests
{
    [Theory]
    [InlineData("yes", null)]
    [InlineData("no", "error")]
    [InlineData("dont_know", "warning")]
    public void Compute_UsesExplicitNormalErrorAndWarningAnswers(string answer, string? expectedLevel)
    {
        var formJson = JsonSerializer.Serialize(new
        {
            components = new object[]
            {
                new
                {
                    type = "radio",
                    key = "safeToOperate",
                    label = "Safe to operate?",
                    properties = new
                    {
                        abnormal_enabled = true,
                        abnormal_normal_values = new[] { new { value = "yes" } },
                        abnormal_error_values = new[] { new { value = "no" } },
                        abnormal_warning_values = new[] { new { value = "dont_know" } },
                        abnormal_default_level = "none",
                    },
                },
            },
        });
        var submissionJson = JsonSerializer.Serialize(new { safeToOperate = answer });

        var abnormalities = AbnormalitiesService.Compute(formJson, submissionJson);

        if (expectedLevel is null)
        {
            Assert.Empty(abnormalities);
            return;
        }

        var abnormality = Assert.Single(abnormalities);
        Assert.Equal(expectedLevel, abnormality.Level);
    }

    [Fact]
    public void Compute_UsesDefaultLevelForAnswersOutsideNormalList()
    {
        var formJson = JsonSerializer.Serialize(new
        {
            components = new object[]
            {
                new
                {
                    type = "select",
                    key = "condition",
                    label = "Condition",
                    properties = new
                    {
                        abnormal_enabled = true,
                        abnormal_normal_values = new[] { new { value = "good" } },
                        abnormal_default_level = "warning",
                    },
                },
            },
        });
        var submissionJson = JsonSerializer.Serialize(new { condition = "fair" });

        var abnormality = Assert.Single(AbnormalitiesService.Compute(formJson, submissionJson));

        Assert.Equal("warning", abnormality.Level);
    }
}
