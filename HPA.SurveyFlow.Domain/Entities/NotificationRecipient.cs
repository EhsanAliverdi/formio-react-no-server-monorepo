namespace HPA.SurveyFlow.Domain.Entities;

public class NotificationRecipient
{
    public int NotificationId { get; set; }
    public int UserId { get; set; }
    public DateTime DeliveredAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReadAt { get; set; }

    public Notification Notification { get; set; } = null!;
    public User User { get; set; } = null!;
}
