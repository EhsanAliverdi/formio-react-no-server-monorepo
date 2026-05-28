using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HPA.SurveyFlow.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class Phase2_AggregationColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "group_by_json",
                table: "report_templates",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "measures_json",
                table: "report_templates",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "group_by_json",
                table: "report_templates");

            migrationBuilder.DropColumn(
                name: "measures_json",
                table: "report_templates");
        }
    }
}
