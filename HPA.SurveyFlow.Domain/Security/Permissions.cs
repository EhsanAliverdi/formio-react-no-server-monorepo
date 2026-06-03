namespace HPA.SurveyFlow.Domain.Security;

public static class Permissions
{
    public const string ClaimType = "permission";

    public static class Forms
    {
        public const string Read = "forms.read";
        public const string Manage = "forms.manage";
        public const string Submit = "forms.submit";
    }

    public static class Submissions
    {
        public const string ReadOwn = "submissions.read_own";
        public const string ReadAll = "submissions.read_all";
        public const string UpdateAll = "submissions.update_all";
        public const string SecondarySubmit = "submissions.secondary_submit";
        public const string ExportPdf = "submissions.export_pdf";
    }

    public static class Users
    {
        public const string ReadSelf = "users.read_self";
        public const string UpdateSelf = "users.update_self";
        public const string Manage = "users.manage";
    }

    public static class Admin
    {
        public const string ViewDashboard = "admin.dashboard";
        public const string ManageSettings = "admin.settings";
        public const string ViewLogs = "admin.logs";
    }

    public static class Jobs
    {
        public const string Read = "jobs.read";
        public const string Manage = "jobs.manage";
    }

    public static class Reports
    {
        public const string Read = "reports.read";
        public const string Manage = "reports.manage";
        public const string ManageAlerts = "reports.manage_alerts";
    }

    public static class Pages
    {
        public const string Read = "pages.read";
        public const string Manage = "pages.manage";
    }

    public static class AuditLogs
    {
        public const string Read = "audit_logs.read";
    }

    public static class ApiKeys
    {
        public const string Manage = "api_keys.manage";
    }
}
