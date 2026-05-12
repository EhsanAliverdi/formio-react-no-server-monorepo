namespace HPA.SurveyFlow.Domain.Entities;

public class Notification
{
    public int Id { get; set; }
    public string Title { get; set; } = null!;
    public string Body { get; set; } = null!;
    public string Type { get; set; } = "info";
    public string Level { get; set; } = "normal";
    public int? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User? Creator { get; set; }
    public ICollection<NotificationRecipient> Recipients { get; set; } = [];
}
