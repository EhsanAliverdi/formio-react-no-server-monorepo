using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HPA.SurveyFlow.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCategoryLayoutFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "card_style",
                table: "categories",
                type: "text",
                nullable: false,
                defaultValue: "overlay");

            migrationBuilder.AddColumn<int>(
                name: "columns",
                table: "categories",
                type: "integer",
                nullable: false,
                defaultValue: 3);

            migrationBuilder.AddColumn<string>(
                name: "layout_mode",
                table: "categories",
                type: "text",
                nullable: false,
                defaultValue: "card");

            migrationBuilder.AddColumn<bool>(
                name: "show_button",
                table: "categories",
                type: "boolean",
                nullable: false,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "card_style",
                table: "categories");

            migrationBuilder.DropColumn(
                name: "columns",
                table: "categories");

            migrationBuilder.DropColumn(
                name: "layout_mode",
                table: "categories");

            migrationBuilder.DropColumn(
                name: "show_button",
                table: "categories");
        }
    }
}
