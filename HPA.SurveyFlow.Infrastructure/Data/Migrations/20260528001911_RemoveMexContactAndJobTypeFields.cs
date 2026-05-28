using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HPA.SurveyFlow.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class RemoveMexContactAndJobTypeFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "contact_id_field",
                table: "form_integration_rule_mex");

            migrationBuilder.DropColumn(
                name: "job_type_field",
                table: "form_integration_rule_mex");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "contact_id_field",
                table: "form_integration_rule_mex",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "job_type_field",
                table: "form_integration_rule_mex",
                type: "text",
                nullable: true);
        }
    }
}
