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
    public DbSet<RlsPolicy> RlsPolicies { get; set; }
    public DbSet<UserFavouriteReport> UserFavouriteReports { get; set; }
    public DbSet<ReportExecutionLog> ReportExecutionLogs { get; set; }
    public DbSet<Dataset> Datasets { get; set; }
    public DbSet<ScheduledReport> ScheduledReports { get; set; }
    public DbSet<AuditLog> AuditLogs { get; set; }
    public DbSet<ApiKey> ApiKeys { get; set; }
    public DbSet<FormVersion> FormVersions { get; set; }
    public DbSet<ReportAlert> ReportAlerts { get; set; }
    public DbSet<Category> Categories { get; set; }
    public DbSet<SubmissionRuleLog> SubmissionRuleLogs { get; set; }

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
            e.Property(r => r.FieldDriftJson).HasColumnName("field_drift_json");
            e.Property(r => r.Tags).HasColumnName("tags");
            e.Property(r => r.Category).HasColumnName("category");
            e.Property(r => r.SharedWithRolesJson).HasColumnName("shared_with_roles_json");
            e.Property(r => r.GroupByJson).HasColumnName("group_by_json");
            e.Property(r => r.MeasuresJson).HasColumnName("measures_json");
            e.Property(r => r.ChartType).HasColumnName("chart_type").HasDefaultValue("table");
            e.Property(r => r.ChartConfigJson).HasColumnName("chart_config_json");
            e.Property(r => r.DatasetId).HasColumnName("dataset_id");
            e.HasOne(r => r.Form).WithMany().HasForeignKey(r => r.FormId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(r => r.CreatedByUser).WithMany().HasForeignKey(r => r.CreatedBy).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(r => r.FormId);
        });

        modelBuilder.Entity<RlsPolicy>(e =>
        {
            e.ToTable("rls_policies");
            e.HasKey(p => p.Id);
            e.Property(p => p.Id).HasColumnName("id").UseIdentityAlwaysColumn();
            e.Property(p => p.ReportTemplateId).HasColumnName("report_template_id");
            e.Property(p => p.Name).HasColumnName("name").IsRequired();
            e.Property(p => p.WhereFragment).HasColumnName("where_fragment").IsRequired();
            e.Property(p => p.AppliestoRoles).HasColumnName("applies_to_roles");
            e.Property(p => p.IsActive).HasColumnName("is_active").HasDefaultValue(true);
            e.Property(p => p.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
            e.HasOne(p => p.ReportTemplate).WithMany().HasForeignKey(p => p.ReportTemplateId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(p => p.ReportTemplateId);
        });

        modelBuilder.Entity<UserFavouriteReport>(e =>
        {
            e.ToTable("user_favourite_reports");
            e.HasKey(f => f.Id);
            e.Property(f => f.Id).HasColumnName("id").UseIdentityAlwaysColumn();
            e.Property(f => f.UserId).HasColumnName("user_id");
            e.Property(f => f.ReportTemplateId).HasColumnName("report_template_id");
            e.Property(f => f.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
            e.HasOne(f => f.User).WithMany().HasForeignKey(f => f.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(f => f.ReportTemplate).WithMany().HasForeignKey(f => f.ReportTemplateId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(f => new { f.UserId, f.ReportTemplateId }).IsUnique();
        });

        modelBuilder.Entity<ReportExecutionLog>(e =>
        {
            e.ToTable("report_execution_logs");
            e.HasKey(l => l.Id);
            e.Property(l => l.Id).HasColumnName("id").UseIdentityAlwaysColumn();
            e.Property(l => l.ReportTemplateId).HasColumnName("report_template_id");
            e.Property(l => l.UserId).HasColumnName("user_id");
            e.Property(l => l.ExecutedAt).HasColumnName("executed_at").HasDefaultValueSql("now()");
            e.Property(l => l.DurationMs).HasColumnName("duration_ms");
            e.Property(l => l.RowCount).HasColumnName("row_count");
            e.Property(l => l.ExecutionType).HasColumnName("execution_type").HasDefaultValue("view");
            e.HasOne(l => l.ReportTemplate).WithMany().HasForeignKey(l => l.ReportTemplateId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(l => l.User).WithMany().HasForeignKey(l => l.UserId).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(l => new { l.UserId, l.ExecutedAt });
            e.HasIndex(l => l.ReportTemplateId);
        });

        modelBuilder.Entity<Dataset>(e =>
        {
            e.ToTable("datasets");
            e.HasKey(d => d.Id);
            e.Property(d => d.Id).HasColumnName("id").UseIdentityAlwaysColumn();
            e.Property(d => d.Name).HasColumnName("name").IsRequired();
            e.Property(d => d.Description).HasColumnName("description");
            e.Property(d => d.FormId).HasColumnName("form_id");
            e.Property(d => d.BaseFiltersJson).HasColumnName("base_filters_json");
            e.Property(d => d.FieldsJson).HasColumnName("fields_json");
            e.Property(d => d.CreatedBy).HasColumnName("created_by");
            e.Property(d => d.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
            e.Property(d => d.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()");
            e.Property(d => d.IsActive).HasColumnName("is_active").HasDefaultValue(true);
            e.HasOne(d => d.Form).WithMany().HasForeignKey(d => d.FormId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(d => d.CreatedByUser).WithMany().HasForeignKey(d => d.CreatedBy).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(d => d.FormId);
        });

        modelBuilder.Entity<ScheduledReport>(e =>
        {
            e.ToTable("scheduled_reports");
            e.HasKey(s => s.Id);
            e.Property(s => s.Id).HasColumnName("id").UseIdentityAlwaysColumn();
            e.Property(s => s.ReportTemplateId).HasColumnName("report_template_id");
            e.Property(s => s.Name).HasColumnName("name").IsRequired();
            e.Property(s => s.CronExpression).HasColumnName("cron_expression").IsRequired();
            e.Property(s => s.Recipients).HasColumnName("recipients").IsRequired();
            e.Property(s => s.Subject).HasColumnName("subject").HasDefaultValue("{{ReportName}} — {{RunDate}}");
            e.Property(s => s.IsEnabled).HasColumnName("is_enabled").HasDefaultValue(true);
            e.Property(s => s.CreatedBy).HasColumnName("created_by");
            e.Property(s => s.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
            e.Property(s => s.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()");
            e.Property(s => s.LastRunAt).HasColumnName("last_run_at");
            e.Property(s => s.NextRunAt).HasColumnName("next_run_at");
            e.Property(s => s.LastRunStatus).HasColumnName("last_run_status");
            e.Property(s => s.LastRunError).HasColumnName("last_run_error");
            e.HasOne(s => s.ReportTemplate).WithMany().HasForeignKey(s => s.ReportTemplateId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(s => s.CreatedByUser).WithMany().HasForeignKey(s => s.CreatedBy).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(s => s.ReportTemplateId);
            e.HasIndex(s => new { s.IsEnabled, s.NextRunAt });
        });

        modelBuilder.Entity<AuditLog>(e =>
        {
            e.ToTable("audit_logs");
            e.HasKey(a => a.Id);
            e.Property(a => a.Id).HasColumnName("id").UseIdentityAlwaysColumn();
            e.Property(a => a.ActorId).HasColumnName("actor_id");
            e.Property(a => a.ActorEmail).HasColumnName("actor_email").HasDefaultValue("system");
            e.Property(a => a.Action).HasColumnName("action").IsRequired();
            e.Property(a => a.EntityType).HasColumnName("entity_type").IsRequired();
            e.Property(a => a.EntityId).HasColumnName("entity_id").IsRequired();
            e.Property(a => a.EntityName).HasColumnName("entity_name");
            e.Property(a => a.ChangesJson).HasColumnName("changes_json");
            e.Property(a => a.IpAddress).HasColumnName("ip_address");
            e.Property(a => a.OccurredAt).HasColumnName("occurred_at").HasDefaultValueSql("now()");
            e.HasOne(a => a.Actor).WithMany().HasForeignKey(a => a.ActorId).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(a => new { a.EntityType, a.EntityId });
            e.HasIndex(a => a.OccurredAt);
            e.HasIndex(a => a.ActorId);
        });

        modelBuilder.Entity<ApiKey>(e =>
        {
            e.ToTable("api_keys");
            e.HasKey(k => k.Id);
            e.Property(k => k.Id).HasColumnName("id").UseIdentityAlwaysColumn();
            e.Property(k => k.Name).HasColumnName("name").IsRequired();
            e.Property(k => k.Prefix).HasColumnName("prefix").IsRequired().HasMaxLength(8);
            e.Property(k => k.KeyHash).HasColumnName("key_hash").IsRequired();
            e.Property(k => k.Scopes).HasColumnName("scopes").HasDefaultValue(string.Empty);
            e.Property(k => k.CreatedBy).HasColumnName("created_by");
            e.Property(k => k.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
            e.Property(k => k.LastUsedAt).HasColumnName("last_used_at");
            e.Property(k => k.ExpiresAt).HasColumnName("expires_at");
            e.Property(k => k.IsActive).HasColumnName("is_active").HasDefaultValue(true);
            e.HasOne(k => k.CreatedByUser).WithMany().HasForeignKey(k => k.CreatedBy).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(k => k.Prefix).IsUnique();
        });

        modelBuilder.Entity<FormVersion>(e =>
        {
            e.ToTable("form_versions");
            e.HasKey(v => v.Id);
            e.Property(v => v.Id).HasColumnName("id").UseIdentityAlwaysColumn();
            e.Property(v => v.FormId).HasColumnName("form_id");
            e.Property(v => v.VersionNumber).HasColumnName("version_number");
            e.Property(v => v.JsonSnapshot).HasColumnName("json_snapshot").IsRequired();
            e.Property(v => v.ChangeSummary).HasColumnName("change_summary");
            e.Property(v => v.CreatedBy).HasColumnName("created_by");
            e.Property(v => v.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
            e.HasOne(v => v.Form).WithMany().HasForeignKey(v => v.FormId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(v => v.CreatedByUser).WithMany().HasForeignKey(v => v.CreatedBy).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(v => new { v.FormId, v.VersionNumber }).IsUnique();
        });

        modelBuilder.Entity<SubmissionRuleLog>(e =>
        {
            e.ToTable("submission_rule_logs");
            e.HasKey(l => l.Id);
            e.Property(l => l.Id).HasColumnName("id").UseIdentityAlwaysColumn();
            e.Property(l => l.SubmissionId).HasColumnName("submission_id");
            e.Property(l => l.RuleId).HasColumnName("rule_id");
            e.Property(l => l.RuleName).HasColumnName("rule_name").IsRequired();
            e.Property(l => l.RuleType).HasColumnName("rule_type").IsRequired();
            e.Property(l => l.Channel).HasColumnName("channel").IsRequired();
            e.Property(l => l.Action).HasColumnName("action");
            e.Property(l => l.Status).HasColumnName("status").IsRequired();
            e.Property(l => l.RequestJson).HasColumnName("request_json");
            e.Property(l => l.ResponseJson).HasColumnName("response_json");
            e.Property(l => l.StatusCode).HasColumnName("status_code");
            e.Property(l => l.ErrorMessage).HasColumnName("error_message");
            e.Property(l => l.TriggeredAt).HasColumnName("triggered_at").HasDefaultValueSql("now()");
            e.Property(l => l.CompletedAt).HasColumnName("completed_at");
            e.HasOne(l => l.Submission).WithMany().HasForeignKey(l => l.SubmissionId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(l => l.SubmissionId);
        });

        modelBuilder.Entity<Category>(e =>
        {
            e.ToTable("categories");
            e.HasKey(c => c.Id);
            e.Property(c => c.Id).HasColumnName("id").UseIdentityAlwaysColumn();
            e.Property(c => c.Slug).HasColumnName("slug").IsRequired();
            e.Property(c => c.Name).HasColumnName("name").IsRequired();
            e.Property(c => c.Description).HasColumnName("description");
            e.Property(c => c.Visibility).HasColumnName("visibility").HasDefaultValue("public");
            e.Property(c => c.ImageUrl).HasColumnName("image_url");
            e.Property(c => c.IconKey).HasColumnName("icon_key");
            e.Property(c => c.ShowTitle).HasColumnName("show_title").HasDefaultValue(true);
            e.Property(c => c.ShowDescription).HasColumnName("show_description").HasDefaultValue(true);
            e.Property(c => c.ShowButton).HasColumnName("show_button").HasDefaultValue(true);
            e.Property(c => c.ButtonText).HasColumnName("button_text");
            e.Property(c => c.LayoutMode).HasColumnName("layout_mode").HasDefaultValue("card");
            e.Property(c => c.Columns).HasColumnName("columns").HasDefaultValue(3);
            e.Property(c => c.CardStyle).HasColumnName("card_style").HasDefaultValue("overlay");
            e.Property(c => c.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
            e.Property(c => c.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()");
            e.HasIndex(c => c.Slug).IsUnique();
        });

        modelBuilder.Entity<ReportAlert>(e =>
        {
            e.ToTable("report_alerts");
            e.HasKey(a => a.Id);
            e.Property(a => a.Id).HasColumnName("id").UseIdentityAlwaysColumn();
            e.Property(a => a.ReportTemplateId).HasColumnName("report_template_id");
            e.Property(a => a.Name).HasColumnName("name").IsRequired();
            e.Property(a => a.ConditionField).HasColumnName("condition_field").IsRequired();
            e.Property(a => a.ConditionOperator).HasColumnName("condition_operator").HasDefaultValue("gt");
            e.Property(a => a.Threshold).HasColumnName("threshold").HasColumnType("numeric(18,4)");
            e.Property(a => a.EvaluationCron).HasColumnName("evaluation_cron").IsRequired();
            e.Property(a => a.Recipients).HasColumnName("recipients").HasDefaultValue(string.Empty);
            e.Property(a => a.WebhookUrl).HasColumnName("webhook_url");
            e.Property(a => a.IsEnabled).HasColumnName("is_enabled").HasDefaultValue(true);
            e.Property(a => a.CreatedBy).HasColumnName("created_by");
            e.Property(a => a.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
            e.Property(a => a.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()");
            e.Property(a => a.LastEvaluatedAt).HasColumnName("last_evaluated_at");
            e.Property(a => a.LastTriggeredAt).HasColumnName("last_triggered_at");
            e.Property(a => a.LastValue).HasColumnName("last_value").HasColumnType("numeric(18,4)");
            e.Property(a => a.LastStatus).HasColumnName("last_status");
            e.Property(a => a.LastError).HasColumnName("last_error");
            e.HasOne(a => a.ReportTemplate).WithMany().HasForeignKey(a => a.ReportTemplateId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(a => a.CreatedByUser).WithMany().HasForeignKey(a => a.CreatedBy).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(a => a.ReportTemplateId);
            e.HasIndex(a => new { a.IsEnabled, a.LastEvaluatedAt });
        });
    }
}
