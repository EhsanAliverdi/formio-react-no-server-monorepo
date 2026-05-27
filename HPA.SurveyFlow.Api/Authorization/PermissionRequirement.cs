using Microsoft.AspNetCore.Authorization;

namespace HPA.SurveyFlow.Api.Authorization;

public sealed class PermissionRequirement(string permission) : IAuthorizationRequirement
{
    public string Permission { get; } = permission;
}
