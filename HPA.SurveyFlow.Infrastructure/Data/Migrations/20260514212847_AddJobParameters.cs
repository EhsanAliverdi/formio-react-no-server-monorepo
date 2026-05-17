using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HPA.SurveyFlow.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddJobParameters : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "default_parameters",
                table: "scheduled_job_definitions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "parameter_schema",
                table: "scheduled_job_definitions",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "default_parameters",
                table: "scheduled_job_definitions");

            migrationBuilder.DropColumn(
                name: "parameter_schema",
                table: "scheduled_job_definitions");
        }
    }
}
