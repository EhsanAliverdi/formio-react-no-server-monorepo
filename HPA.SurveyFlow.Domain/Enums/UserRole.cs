namespace HPA.SurveyFlow.Domain.Enums;

public static class UserRole
{
    public const string Admin = "admin";
    public const string Editor = "editor";
    public const string Viewer = "viewer";

    public static readonly string[] All = [Admin, Editor, Viewer];
    public static readonly string[] Privileged = [Admin, Editor];
}
