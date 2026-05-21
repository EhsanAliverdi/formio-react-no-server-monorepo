using Microsoft.AspNetCore.Authorization;

namespace HPA.SurveyFlow.Api.Authorization;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true, Inherited = true)]
public sealed class RequirePermissionAttribute : AuthorizeAttribute
{
    public RequirePermissionAttribute(string permission)
    {
        Permission = permission;
        Policy = PermissionPolicyProvider.PolicyPrefix + permission;
    }

    public string Permission { get; }
}
