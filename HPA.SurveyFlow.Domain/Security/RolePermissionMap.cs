using HPA.SurveyFlow.Domain.Enums;

namespace HPA.SurveyFlow.Domain.Security;

public static class RolePermissionMap
{
    private static readonly IReadOnlyDictionary<string, string[]> Map = new Dictionary<string, string[]>
    {
        [UserRole.Admin] =
        [
            Permissions.Forms.Read,
            Permissions.Forms.Manage,
            Permissions.Forms.Submit,
            Permissions.Submissions.ReadOwn,
            Permissions.Submissions.ReadAll,
            Permissions.Submissions.UpdateAll,
            Permissions.Submissions.SecondarySubmit,
            Permissions.Submissions.ExportPdf,
            Permissions.Users.ReadSelf,
            Permissions.Users.UpdateSelf,
            Permissions.Users.Manage,
            Permissions.Admin.ViewDashboard,
            Permissions.Admin.ManageSettings,
            Permissions.Admin.ViewLogs,
            Permissions.Jobs.Read,
            Permissions.Jobs.Manage,
            Permissions.Reports.Read,
            Permissions.Reports.Manage,
            Permissions.Reports.ManageAlerts,
            Permissions.AuditLogs.Read,
            Permissions.ApiKeys.Manage,
        ],
        [UserRole.Editor] =
        [
            Permissions.Forms.Read,
            Permissions.Forms.Manage,
            Permissions.Forms.Submit,
            Permissions.Submissions.ReadOwn,
            Permissions.Submissions.ExportPdf,
            Permissions.Users.ReadSelf,
            Permissions.Users.UpdateSelf,
            Permissions.Jobs.Read,
            Permissions.Reports.Read,
            Permissions.Reports.Manage,
            Permissions.Reports.ManageAlerts,
        ],
        [UserRole.Viewer] =
        [
            Permissions.Forms.Read,
            Permissions.Forms.Submit,
            Permissions.Submissions.ReadOwn,
            Permissions.Submissions.ExportPdf,
            Permissions.Users.ReadSelf,
            Permissions.Users.UpdateSelf,
            Permissions.Reports.Read,
        ],
    };

    public static IReadOnlyCollection<string> ForRole(string? role) =>
        role is not null && Map.TryGetValue(role, out var permissions) ? permissions : [];
}
