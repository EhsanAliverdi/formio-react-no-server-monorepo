namespace HPA.SurveyFlow.Domain.Entities;

public class DashboardCard
{
    public int Id { get; set; }
    public int DashboardId { get; set; }
    public int ReportTemplateId { get; set; }
    public string? TitleOverride { get; set; }
    public int X { get; set; }
    public int Y { get; set; }
    public int W { get; set; } = 6;
    public int H { get; set; } = 4;
    public int? MinW { get; set; }
    public int? MinH { get; set; }
    public int? MaxW { get; set; }
    public int? MaxH { get; set; }
    public string? SettingsJson { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Dashboard Dashboard { get; set; } = null!;
    public ReportTemplate ReportTemplate { get; set; } = null!;
}
