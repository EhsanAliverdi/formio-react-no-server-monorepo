using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HPA.SurveyFlow.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDashboardCardDisplaySettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CustomCss",
                table: "dashboard_cards",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "FitContent",
                table: "dashboard_cards",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ShowTitle",
                table: "dashboard_cards",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CustomCss",
                table: "dashboard_cards");

            migrationBuilder.DropColumn(
                name: "FitContent",
                table: "dashboard_cards");

            migrationBuilder.DropColumn(
                name: "ShowTitle",
                table: "dashboard_cards");
        }
    }
}
