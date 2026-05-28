using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HPA.SurveyFlow.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class Phase1_GinIndexAndTemplateMetadata : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "category",
                table: "report_templates",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "field_drift_json",
                table: "report_templates",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "shared_with_roles_json",
                table: "report_templates",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "tags",
                table: "report_templates",
                type: "text",
                nullable: true);

            // GIN index for fast JSONB path operators on form_submissions.data (stored as text, cast to jsonb).
            // Note: CONCURRENTLY cannot run inside a transaction block (EF migrations use transactions),
            // so we use a plain CREATE INDEX here. For a high-traffic production table this can be done
            // manually with CONCURRENTLY after applying the migration.
            migrationBuilder.Sql(
                "CREATE INDEX IF NOT EXISTS idx_form_submissions_data_gin " +
                "ON form_submissions USING GIN ((data::jsonb));");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "DROP INDEX IF EXISTS idx_form_submissions_data_gin;");
            migrationBuilder.DropColumn(
                name: "category",
                table: "report_templates");

            migrationBuilder.DropColumn(
                name: "field_drift_json",
                table: "report_templates");

            migrationBuilder.DropColumn(
                name: "shared_with_roles_json",
                table: "report_templates");

            migrationBuilder.DropColumn(
                name: "tags",
                table: "report_templates");
        }
    }
}
