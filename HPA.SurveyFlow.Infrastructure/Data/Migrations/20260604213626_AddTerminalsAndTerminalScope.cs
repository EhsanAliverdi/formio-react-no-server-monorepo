using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace HPA.SurveyFlow.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTerminalsAndTerminalScope : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "TerminalCode",
                table: "report_templates",
                type: "character varying(16)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "terminal_code",
                table: "pages",
                type: "character varying(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "terminal_code",
                table: "forms",
                type: "character varying(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "terminal_code",
                table: "form_submissions",
                type: "character varying(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "terminal_code",
                table: "datasets",
                type: "character varying(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "terminal_code",
                table: "dashboards",
                type: "character varying(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "terminals",
                columns: table => new
                {
                    code = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    description = table.Column<string>(type: "text", nullable: false),
                    timezone = table.Column<string>(type: "text", nullable: false),
                    port_code = table.Column<string>(type: "text", nullable: false),
                    trading_name = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_terminals", x => x.code);
                });

            migrationBuilder.InsertData(
                table: "terminals",
                columns: new[] { "code", "description", "port_code", "timezone", "trading_name" },
                values: new object[,]
                {
                    { "HPAFI", "HPAFI, Brisbane", "AUBNE", "E. Australia Standard Time", "Brisbane Container Terminals Pty Limited" },
                    { "HPAPB", "HPAPB, Sydney", "AUSYD", "AUS Eastern Standard Time", "Sydney International Container Terminals Pty Limited" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_report_templates_TerminalCode",
                table: "report_templates",
                column: "TerminalCode");

            migrationBuilder.CreateIndex(
                name: "IX_pages_terminal_code",
                table: "pages",
                column: "terminal_code");

            migrationBuilder.CreateIndex(
                name: "IX_forms_terminal_code",
                table: "forms",
                column: "terminal_code");

            migrationBuilder.CreateIndex(
                name: "IX_form_submissions_terminal_code",
                table: "form_submissions",
                column: "terminal_code");

            migrationBuilder.CreateIndex(
                name: "IX_datasets_terminal_code",
                table: "datasets",
                column: "terminal_code");

            migrationBuilder.CreateIndex(
                name: "IX_dashboards_terminal_code",
                table: "dashboards",
                column: "terminal_code");

            migrationBuilder.AddForeignKey(
                name: "FK_dashboards_terminals_terminal_code",
                table: "dashboards",
                column: "terminal_code",
                principalTable: "terminals",
                principalColumn: "code",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_datasets_terminals_terminal_code",
                table: "datasets",
                column: "terminal_code",
                principalTable: "terminals",
                principalColumn: "code",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_form_submissions_terminals_terminal_code",
                table: "form_submissions",
                column: "terminal_code",
                principalTable: "terminals",
                principalColumn: "code",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_forms_terminals_terminal_code",
                table: "forms",
                column: "terminal_code",
                principalTable: "terminals",
                principalColumn: "code",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_pages_terminals_terminal_code",
                table: "pages",
                column: "terminal_code",
                principalTable: "terminals",
                principalColumn: "code",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_report_templates_terminals_TerminalCode",
                table: "report_templates",
                column: "TerminalCode",
                principalTable: "terminals",
                principalColumn: "code",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_dashboards_terminals_terminal_code",
                table: "dashboards");

            migrationBuilder.DropForeignKey(
                name: "FK_datasets_terminals_terminal_code",
                table: "datasets");

            migrationBuilder.DropForeignKey(
                name: "FK_form_submissions_terminals_terminal_code",
                table: "form_submissions");

            migrationBuilder.DropForeignKey(
                name: "FK_forms_terminals_terminal_code",
                table: "forms");

            migrationBuilder.DropForeignKey(
                name: "FK_pages_terminals_terminal_code",
                table: "pages");

            migrationBuilder.DropForeignKey(
                name: "FK_report_templates_terminals_TerminalCode",
                table: "report_templates");

            migrationBuilder.DropTable(
                name: "terminals");

            migrationBuilder.DropIndex(
                name: "IX_report_templates_TerminalCode",
                table: "report_templates");

            migrationBuilder.DropIndex(
                name: "IX_pages_terminal_code",
                table: "pages");

            migrationBuilder.DropIndex(
                name: "IX_forms_terminal_code",
                table: "forms");

            migrationBuilder.DropIndex(
                name: "IX_form_submissions_terminal_code",
                table: "form_submissions");

            migrationBuilder.DropIndex(
                name: "IX_datasets_terminal_code",
                table: "datasets");

            migrationBuilder.DropIndex(
                name: "IX_dashboards_terminal_code",
                table: "dashboards");

            migrationBuilder.DropColumn(
                name: "TerminalCode",
                table: "report_templates");

            migrationBuilder.DropColumn(
                name: "terminal_code",
                table: "pages");

            migrationBuilder.DropColumn(
                name: "terminal_code",
                table: "forms");

            migrationBuilder.DropColumn(
                name: "terminal_code",
                table: "form_submissions");

            migrationBuilder.DropColumn(
                name: "terminal_code",
                table: "datasets");

            migrationBuilder.DropColumn(
                name: "terminal_code",
                table: "dashboards");
        }
    }
}
