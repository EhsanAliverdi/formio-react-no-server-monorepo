using Microsoft.EntityFrameworkCore;
using HPA.SurveyFlow.Domain.Entities;

namespace HPA.SurveyFlow.Infrastructure.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users { get; set; }
    public DbSet<Form> Forms { get; set; }
    public DbSet<Session> Sessions { get; set; }
    public DbSet<FormSubmission> FormSubmissions { get; set; }
    public DbSet<SiteSetting> SiteSettings { get; set; }
    public DbSet<FormAllowedRole> FormAllowedRoles { get; set; }
    public DbSet<FormAllowedUser> FormAllowedUsers { get; set; }
    public DbSet<ScheduledJobDefinition> ScheduledJobDefinitions { get; set; }
    public DbSet<JobRun> JobRuns { get; set; }
    public DbSet<ExternalAsset> ExternalAssets { get; set; }
    public DbSet<FormNotificationRule> FormNotificationRules { get; set; }
    public DbSet<FormNotificationRuleEmail> FormNotificationRuleEmails { get; set; }
    public DbSet<FormIntegrationRule> FormIntegrationRules { get; set; }
    public DbSet<FormIntegrationRuleMex> FormIntegrationRuleMexConfigs { get; set; }
    public DbSet<FormIntegrationRuleWebhook> FormIntegrationRuleWebhooks { get; set; }
    public DbSet<ReportTemplate> ReportTemplates { get; set; }

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
            e.Property(f => f.ParentFormId).HasColumnName("parent_form_id");
            e.HasOne(f => f.ParentForm).WithMany(f => f.ChildForms).HasForeignKey(f => f.ParentFormId).OnDelete(DeleteBehavior.SetNull);
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
            e.Property(fs => fs.ParentSubmissionId).HasColumnName("parent_submission_id");
            e.Property(fs => fs.UserId).HasColumnName("user_id");
            e.Property(fs => fs.SubmittedAt).HasColumnName("submitted_at").HasDefaultValueSql("now()");
            e.Property(fs => fs.Data).HasColumnName("data").IsRequired();
            e.Property(fs => fs.UpdatedAt).HasColumnName("updated_at");
            e.Property(fs => fs.UpdatedBy).HasColumnName("updated_by");
            e.Property(fs => fs.EditHistory).HasColumnName("edit_history");
            e.Property(fs => fs.DeletedAt).HasColumnName("deleted_at");
            e.Property(fs => fs.DeletedBy).HasColumnName("deleted_by");
            e.Property(fs => fs.DeleteReason).HasColumnName("delete_reason");
            e.Property(fs => fs.SecondarySubmitStatus).HasColumnName("secondary_submit_status");
            e.Property(fs => fs.SecondarySubmitResponse).HasColumnName("secondary_submit_response");
            e.Property(fs => fs.SecondarySubmitAt).HasColumnName("secondary_submit_at");
            e.HasOne(fs => fs.Form).WithMany(f => f.Submissions).HasForeignKey(fs => fs.FormId);
            e.HasOne(fs => fs.ParentSubmission).WithMany(fs => fs.ChildSubmissions).HasForeignKey(fs => fs.ParentSubmissionId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(fs => fs.User).WithMany(u => u.Submissions).HasForeignKey(fs => fs.UserId);
            e.HasOne(fs => fs.DeletedByUser).WithMany().HasForeignKey(fs => fs.DeletedBy).OnDelete(DeleteBehavior.SetNull);
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

        modelBuilder.Entity<ScheduledJobDefinition>(e =>
        {
            e.ToTable("scheduled_job_definitions");
            e.HasKey(j => j.Id);
            e.Property(j => j.Id).HasColumnName("id").UseIdentityAlwaysColumn();
            e.Property(j => j.JobKey).HasColumnName("job_key").IsRequired();
            e.Property(j => j.JobType).HasColumnName("job_type").IsRequired();
            e.Property(j => j.DisplayName).HasColumnName("display_name").IsRequired();
            e.Property(j => j.Description).HasColumnName("description");
            e.Property(j => j.CronExpression).HasColumnName("cron_expression").IsRequired();
            e.Property(j => j.IsEnabled).HasColumnName("is_enabled").HasDefaultValue(false);
            e.Property(j => j.SyncMode).HasColumnName("sync_mode").HasDefaultValue("delta");
            e.Property(j => j.OnlyUpdateChanged).HasColumnName("only_update_changed").HasDefaultValue(false);
            e.Property(j => j.DefaultParameters).HasColumnName("default_parameters");
            e.Property(j => j.ParameterSchema).HasColumnName("parameter_schema");
            e.Property(j => j.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
            e.Property(j => j.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()");
            e.HasIndex(j => j.JobKey).IsUnique();
        });

        modelBuilder.Entity<JobRun>(e =>
        {
            e.ToTable("job_runs");
            e.HasKey(r => r.Id);
            e.Property(r => r.Id).HasColumnName("id").UseIdentityAlwaysColumn();
            e.Property(r => r.JobKey).HasColumnName("job_key").IsRequired();
            e.Property(r => r.DisplayName).HasColumnName("display_name").IsRequired();
            e.Property(r => r.TriggerType).HasColumnName("trigger_type").IsRequired();
            e.Property(r => r.TriggeredByEmail).HasColumnName("triggered_by_email");
            e.Property(r => r.StartedAt).HasColumnName("started_at").HasDefaultValueSql("now()");
            e.Property(r => r.CompletedAt).HasColumnName("completed_at");
            e.Property(r => r.Status).HasColumnName("status").IsRequired();
            e.Property(r => r.ErrorMessage).HasColumnName("error_message");
            e.Property(r => r.ResultSummary).HasColumnName("result_summary");
        });


        modelBuilder.Entity<ExternalAsset>(e =>
        {
            e.ToTable("external_assets");
            e.HasKey(a => a.Id);
            e.Property(a => a.Id).HasColumnName("id").UseIdentityAlwaysColumn();
            e.Property(a => a.Source).HasColumnName("source").IsRequired();
            e.Property(a => a.ExternalId).HasColumnName("external_id").IsRequired();
            e.Property(a => a.DisplayName).HasColumnName("display_name").IsRequired();
            e.Property(a => a.Category).HasColumnName("category");
            e.Property(a => a.Location).HasColumnName("location");
            e.Property(a => a.ParentExternalId).HasColumnName("parent_external_id");
            e.Property(a => a.IsActive).HasColumnName("is_active").HasDefaultValue(true);
            e.Property(a => a.RawJson).HasColumnName("raw_json");
            e.Property(a => a.LastSyncedAt).HasColumnName("last_synced_at").HasDefaultValueSql("now()");
            e.Property(a => a.SourceModifiedAt).HasColumnName("source_modified_at");
            e.HasIndex(a => new { a.Source, a.ExternalId }).IsUnique();
        });

        modelBuilder.Entity<FormNotificationRule>(e =>
        {
            e.ToTable("form_notification_rules");
            e.HasKey(r => r.Id);
            e.Property(r => r.Id).HasColumnName("id").UseIdentityAlwaysColumn();
            e.Property(r => r.FormId).HasColumnName("form_id");
            e.Property(r => r.Name).HasColumnName("name").IsRequired();
            e.Property(r => r.Enabled).HasColumnName("enabled").HasDefaultValue(true);
            e.Property(r => r.Channel).HasColumnName("channel").HasDefaultValue("email");
            e.Property(r => r.ConditionGroupJson).HasColumnName("condition_group_json").IsRequired();
            e.Property(r => r.SortOrder).HasColumnName("sort_order").HasDefaultValue(0);
            e.Property(r => r.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
            e.Property(r => r.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()");
            e.HasOne(r => r.Form).WithMany().HasForeignKey(r => r.FormId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<FormNotificationRuleEmail>(e =>
        {
            e.ToTable("form_notification_rule_emails");
            e.HasKey(r => r.Id);
            e.Property(r => r.Id).HasColumnName("id").UseIdentityAlwaysColumn();
            e.Property(r => r.RuleId).HasColumnName("rule_id");
            e.Property(r => r.ToAddressesJson).HasColumnName("to_addresses_json").HasDefaultValue("[]");
            e.Property(r => r.Subject).HasColumnName("subject").HasDefaultValue(string.Empty);
            e.Property(r => r.BodyHtml).HasColumnName("body_html").HasDefaultValue(string.Empty);
            e.Property(r => r.AttachPdf).HasColumnName("attach_pdf").HasDefaultValue(false);
            e.HasOne(r => r.Rule).WithOne(r => r.EmailConfig).HasForeignKey<FormNotificationRuleEmail>(r => r.RuleId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<FormIntegrationRule>(e =>
        {
            e.ToTable("form_integration_rules");
            e.HasKey(r => r.Id);
            e.Property(r => r.Id).HasColumnName("id").UseIdentityAlwaysColumn();
            e.Property(r => r.FormId).HasColumnName("form_id");
            e.Property(r => r.Name).HasColumnName("name").IsRequired();
            e.Property(r => r.Enabled).HasColumnName("enabled").HasDefaultValue(true);
            e.Property(r => r.Channel).HasColumnName("channel").HasDefaultValue("mex");
            e.Property(r => r.ConditionGroupJson).HasColumnName("condition_group_json").IsRequired();
            e.Property(r => r.SortOrder).HasColumnName("sort_order").HasDefaultValue(0);
            e.Property(r => r.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
            e.Property(r => r.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()");
            e.HasOne(r => r.Form).WithMany().HasForeignKey(r => r.FormId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<FormIntegrationRuleMex>(e =>
        {
            e.ToTable("form_integration_rule_mex");
            e.HasKey(r => r.Id);
            e.Property(r => r.Id).HasColumnName("id").UseIdentityAlwaysColumn();
            e.Property(r => r.RuleId).HasColumnName("rule_id");
            e.Property(r => r.Action).HasColumnName("action").HasDefaultValue("create_request");
            e.Property(r => r.FieldMappingsJson).HasColumnName("field_mappings_json").HasDefaultValue("{}");
            e.HasOne(r => r.Rule).WithOne(r => r.MexConfig).HasForeignKey<FormIntegrationRuleMex>(r => r.RuleId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<FormIntegrationRuleWebhook>(e =>
        {
            e.ToTable("form_integration_rule_webhooks");
            e.HasKey(r => r.Id);
            e.Property(r => r.Id).HasColumnName("id").UseIdentityAlwaysColumn();
            e.Property(r => r.RuleId).HasColumnName("rule_id");
            e.Property(r => r.Url).HasColumnName("url").HasDefaultValue(string.Empty);
            e.Property(r => r.Method).HasColumnName("method").HasDefaultValue("POST");
            e.Property(r => r.HeadersJson).HasColumnName("headers_json").HasDefaultValue("[]");
            e.Property(r => r.BodyTemplate).HasColumnName("body_template").HasDefaultValue(string.Empty);
            e.HasOne(r => r.Rule).WithOne(r => r.WebhookConfig).HasForeignKey<FormIntegrationRuleWebhook>(r => r.RuleId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ReportTemplate>(e =>
        {
            e.ToTable("report_templates");
            e.HasKey(r => r.Id);
            e.Property(r => r.Id).HasColumnName("id").UseIdentityAlwaysColumn();
            e.Property(r => r.FormId).HasColumnName("form_id");
            e.Property(r => r.Name).HasColumnName("name").IsRequired();
            e.Property(r => r.Description).HasColumnName("description");
            e.Property(r => r.IsPublic).HasColumnName("is_public").HasDefaultValue(false);
            e.Property(r => r.CreatedBy).HasColumnName("created_by");
            e.Property(r => r.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
            e.Property(r => r.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()");
            e.Property(r => r.ColumnsJson).HasColumnName("columns_json").HasDefaultValue("[]");
            e.Property(r => r.FiltersJson).HasColumnName("filters_json");
            e.Property(r => r.DefaultSortField).HasColumnName("default_sort_field");
            e.Property(r => r.DefaultSortDirection).HasColumnName("default_sort_direction").HasDefaultValue("asc");
            e.Property(r => r.DefaultPageSize).HasColumnName("default_page_size").HasDefaultValue(25);
            e.Property(r => r.DisplayMode).HasColumnName("display_mode").HasDefaultValue("table");
            e.Property(r => r.SchemaVersion).HasColumnName("schema_version");
            e.HasOne(r => r.Form).WithMany().HasForeignKey(r => r.FormId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(r => r.CreatedByUser).WithMany().HasForeignKey(r => r.CreatedBy).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(r => r.FormId);
        });
    }
}
