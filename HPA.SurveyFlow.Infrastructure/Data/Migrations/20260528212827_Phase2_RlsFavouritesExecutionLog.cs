using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace HPA.SurveyFlow.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class Phase2_RlsFavouritesExecutionLog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "report_execution_logs",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    report_template_id = table.Column<int>(type: "integer", nullable: false),
                    user_id = table.Column<int>(type: "integer", nullable: true),
                    executed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    duration_ms = table.Column<int>(type: "integer", nullable: false),
                    row_count = table.Column<int>(type: "integer", nullable: false),
                    execution_type = table.Column<string>(type: "text", nullable: false, defaultValue: "view")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_report_execution_logs", x => x.id);
                    table.ForeignKey(
                        name: "FK_report_execution_logs_report_templates_report_template_id",
                        column: x => x.report_template_id,
                        principalTable: "report_templates",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_report_execution_logs_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "rls_policies",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    report_template_id = table.Column<int>(type: "integer", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    where_fragment = table.Column<string>(type: "text", nullable: false),
                    applies_to_roles = table.Column<string>(type: "text", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_rls_policies", x => x.id);
                    table.ForeignKey(
                        name: "FK_rls_policies_report_templates_report_template_id",
                        column: x => x.report_template_id,
                        principalTable: "report_templates",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "user_favourite_reports",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    user_id = table.Column<int>(type: "integer", nullable: false),
                    report_template_id = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_favourite_reports", x => x.id);
                    table.ForeignKey(
                        name: "FK_user_favourite_reports_report_templates_report_template_id",
                        column: x => x.report_template_id,
                        principalTable: "report_templates",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_user_favourite_reports_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_report_execution_logs_report_template_id",
                table: "report_execution_logs",
                column: "report_template_id");

            migrationBuilder.CreateIndex(
                name: "IX_report_execution_logs_user_id_executed_at",
                table: "report_execution_logs",
                columns: new[] { "user_id", "executed_at" });

            migrationBuilder.CreateIndex(
                name: "IX_rls_policies_report_template_id",
                table: "rls_policies",
                column: "report_template_id");

            migrationBuilder.CreateIndex(
                name: "IX_user_favourite_reports_report_template_id",
                table: "user_favourite_reports",
                column: "report_template_id");

            migrationBuilder.CreateIndex(
                name: "IX_user_favourite_reports_user_id_report_template_id",
                table: "user_favourite_reports",
                columns: new[] { "user_id", "report_template_id" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "report_execution_logs");

            migrationBuilder.DropTable(
                name: "rls_policies");

            migrationBuilder.DropTable(
                name: "user_favourite_reports");
        }
    }
}
