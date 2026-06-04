using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HPA.SurveyFlow.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddReportTemplateSourceType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_report_templates_terminals_TerminalCode",
                table: "report_templates");

            migrationBuilder.RenameColumn(
                name: "TerminalCode",
                table: "report_templates",
                newName: "terminal_code");

            migrationBuilder.RenameIndex(
                name: "IX_report_templates_TerminalCode",
                table: "report_templates",
                newName: "IX_report_templates_terminal_code");

            migrationBuilder.AddColumn<string>(
                name: "source_type",
                table: "report_templates",
                type: "text",
                nullable: false,
                defaultValue: "form_submissions");

            migrationBuilder.AddForeignKey(
                name: "FK_report_templates_terminals_terminal_code",
                table: "report_templates",
                column: "terminal_code",
                principalTable: "terminals",
                principalColumn: "code",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_report_templates_terminals_terminal_code",
                table: "report_templates");

            migrationBuilder.DropColumn(
                name: "source_type",
                table: "report_templates");

            migrationBuilder.RenameColumn(
                name: "terminal_code",
                table: "report_templates",
                newName: "TerminalCode");

            migrationBuilder.RenameIndex(
                name: "IX_report_templates_terminal_code",
                table: "report_templates",
                newName: "IX_report_templates_TerminalCode");

            migrationBuilder.AddForeignKey(
                name: "FK_report_templates_terminals_TerminalCode",
                table: "report_templates",
                column: "TerminalCode",
                principalTable: "terminals",
                principalColumn: "code",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
