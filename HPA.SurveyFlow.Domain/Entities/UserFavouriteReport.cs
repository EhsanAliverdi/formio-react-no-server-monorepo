namespace HPA.SurveyFlow.Domain.Entities;

/// <summary>
/// Records that a user has starred a report template as a favourite.
/// Used to populate the "Favourites" section on the reports list page.
/// </summary>
public class UserFavouriteReport
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int ReportTemplateId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
    public ReportTemplate ReportTemplate { get; set; } = null!;
}
