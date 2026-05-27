using HPA.SurveyFlow.Domain.Entities;

namespace HPA.SurveyFlow.Test.Domain;

public class FormTests
{
    [Fact]
    public void NewForm_UsesPublicAnonymousDefaults()
    {
        var form = new Form();

        Assert.True(form.AllowAnonymousSubmit);
        Assert.Equal("public", form.Visibility);
        Assert.Empty(form.Submissions);
        Assert.Empty(form.AllowedRoles);
        Assert.Empty(form.AllowedUsers);
    }
}
