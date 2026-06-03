using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HPA.SurveyFlow.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDashboardCardDisplayMode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DisplayMode",
                table: "dashboard_cards",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DisplayMode",
                table: "dashboard_cards");
        }
    }
}
