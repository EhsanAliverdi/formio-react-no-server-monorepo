using Microsoft.EntityFrameworkCore;
using SurveyFlow.Core.Entities;

namespace SurveyFlow.Infrastructure.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users { get; set; }
    public DbSet<Form> Forms { get; set; }
    public DbSet<Session> Sessions { get; set; }
    public DbSet<FormSubmission> FormSubmissions { get; set; }
    public DbSet<Notification> Notifications { get; set; }
    public DbSet<NotificationRecipient> NotificationRecipients { get; set; }
    public DbSet<SiteSetting> SiteSettings { get; set; }
    public DbSet<FormAllowedRole> FormAllowedRoles { get; set; }
    public DbSet<FormAllowedUser> FormAllowedUsers { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(e =>
        {
            e.ToTable("users");
            e.HasKey(u => u.Id);
            e.Property(u => u.Id).HasColumnName("id").UseIdentityAlwaysColumn();
            e.Property(u => u.Email).HasColumnName("email").IsRequired();
            e.Property(u => u.PasswordHash).HasColumnName("password_hash").IsRequired();
            e.Property(u => u.Role).HasColumnName("role").HasDefaultValue("admin");
            e.Property(u => u.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
            e.Property(u => u.DisplayName).HasColumnName("display_name");
            e.Property(u => u.PreferredName).HasColumnName("preferred_name");
            e.Property(u => u.FirstName).HasColumnName("first_name");
            e.Property(u => u.MiddleName).HasColumnName("middle_name");
            e.Property(u => u.LastName).HasColumnName("last_name");
            e.Property(u => u.Pronouns).HasColumnName("pronouns");
            e.Property(u => u.DateOfBirth).HasColumnName("date_of_birth");
            e.Property(u => u.Phone).HasColumnName("phone");
            e.Property(u => u.JobTitle).HasColumnName("job_title");
            e.Property(u => u.Department).HasColumnName("department");
            e.Property(u => u.Company).HasColumnName("company");
            e.Property(u => u.WebsiteUrl).HasColumnName("website_url");
            e.Property(u => u.Bio).HasColumnName("bio");
            e.Property(u => u.AddressLine1).HasColumnName("address_line1");
            e.Property(u => u.AddressLine2).HasColumnName("address_line2");
            e.Property(u => u.City).HasColumnName("city");
            e.Property(u => u.State).HasColumnName("state");
            e.Property(u => u.PostalCode).HasColumnName("postal_code");
            e.Property(u => u.Country).HasColumnName("country");
            e.Property(u => u.Timezone).HasColumnName("timezone");
            e.Property(u => u.Locale).HasColumnName("locale");
            e.Property(u => u.AvatarUrl).HasColumnName("avatar_url");
            e.Property(u => u.IsActive).HasColumnName("is_active").HasDefaultValue(true);
            e.HasIndex(u => u.Email).IsUnique();
        });

        modelBuilder.Entity<Form>(e =>
        {
            e.ToTable("forms");
            e.HasKey(f => f.Id);
            e.Property(f => f.Id).HasColumnName("id").UseIdentityAlwaysColumn();
            e.Property(f => f.Name).HasColumnName("name").IsRequired();
            e.Property(f => f.Json).HasColumnName("json").IsRequired();
            e.Property(f => f.AllowAnonymousSubmit).HasColumnName("allow_anonymous_submit").HasDefaultValue(true);
            e.Property(f => f.Visibility).HasColumnName("visibility").HasDefaultValue("public");
        });

        modelBuilder.Entity<Session>(e =>
        {
            e.ToTable("sessions");
            e.HasKey(s => s.Id);
            e.Property(s => s.Id).HasColumnName("id").UseIdentityAlwaysColumn();
            e.Property(s => s.UserId).HasColumnName("user_id");
            e.Property(s => s.TokenHash).HasColumnName("token_hash").IsRequired();
            e.Property(s => s.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
            e.Property(s => s.ExpiresAt).HasColumnName("expires_at");
            e.HasIndex(s => s.TokenHash).IsUnique();
            e.HasOne(s => s.User).WithMany(u => u.Sessions).HasForeignKey(s => s.UserId);
        });

        modelBuilder.Entity<FormSubmission>(e =>
        {
            e.ToTable("form_submissions");
            e.HasKey(fs => fs.Id);
            e.Property(fs => fs.Id).HasColumnName("id").UseIdentityAlwaysColumn();
            e.Property(fs => fs.FormId).HasColumnName("form_id");
            e.Property(fs => fs.UserId).HasColumnName("user_id");
            e.Property(fs => fs.SubmittedAt).HasColumnName("submitted_at").HasDefaultValueSql("now()");
            e.Property(fs => fs.Data).HasColumnName("data").IsRequired();
            e.Property(fs => fs.UpdatedAt).HasColumnName("updated_at");
            e.Property(fs => fs.UpdatedBy).HasColumnName("updated_by");
            e.Property(fs => fs.EditHistory).HasColumnName("edit_history");
            e.HasOne(fs => fs.Form).WithMany(f => f.Submissions).HasForeignKey(fs => fs.FormId);
            e.HasOne(fs => fs.User).WithMany(u => u.Submissions).HasForeignKey(fs => fs.UserId);
        });

        modelBuilder.Entity<Notification>(e =>
        {
            e.ToTable("notifications");
            e.HasKey(n => n.Id);
            e.Property(n => n.Id).HasColumnName("id").UseIdentityAlwaysColumn();
            e.Property(n => n.Title).HasColumnName("title").IsRequired();
            e.Property(n => n.Body).HasColumnName("body").IsRequired();
            e.Property(n => n.Type).HasColumnName("type").HasDefaultValue("info");
            e.Property(n => n.Level).HasColumnName("level").HasDefaultValue("normal");
            e.Property(n => n.CreatedBy).HasColumnName("created_by");
            e.Property(n => n.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
            e.HasOne(n => n.Creator).WithMany(u => u.CreatedNotifications)
                .HasForeignKey(n => n.CreatedBy).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<NotificationRecipient>(e =>
        {
            e.ToTable("notification_recipients");
            e.HasKey(nr => new { nr.NotificationId, nr.UserId });
            e.Property(nr => nr.NotificationId).HasColumnName("notification_id");
            e.Property(nr => nr.UserId).HasColumnName("user_id");
            e.Property(nr => nr.DeliveredAt).HasColumnName("delivered_at").HasDefaultValueSql("now()");
            e.Property(nr => nr.ReadAt).HasColumnName("read_at");
            e.HasOne(nr => nr.Notification).WithMany(n => n.Recipients).HasForeignKey(nr => nr.NotificationId);
            e.HasOne(nr => nr.User).WithMany(u => u.NotificationRecipients).HasForeignKey(nr => nr.UserId);
        });

        modelBuilder.Entity<SiteSetting>(e =>
        {
            e.ToTable("site_settings");
            e.HasKey(ss => ss.Key);
            e.Property(ss => ss.Key).HasColumnName("key");
            e.Property(ss => ss.Value).HasColumnName("value");
        });

        modelBuilder.Entity<FormAllowedRole>(e =>
        {
            e.ToTable("form_allowed_roles");
            e.HasKey(far => new { far.FormId, far.Role });
            e.Property(far => far.FormId).HasColumnName("form_id");
            e.Property(far => far.Role).HasColumnName("role");
            e.HasOne(far => far.Form).WithMany(f => f.AllowedRoles).HasForeignKey(far => far.FormId);
        });

        modelBuilder.Entity<FormAllowedUser>(e =>
        {
            e.ToTable("form_allowed_users");
            e.HasKey(fau => new { fau.FormId, fau.UserId });
            e.Property(fau => fau.FormId).HasColumnName("form_id");
            e.Property(fau => fau.UserId).HasColumnName("user_id");
            e.HasOne(fau => fau.Form).WithMany(f => f.AllowedUsers).HasForeignKey(fau => fau.FormId);
            e.HasOne(fau => fau.User).WithMany(u => u.AllowedForms).HasForeignKey(fau => fau.UserId);
        });
    }
}
