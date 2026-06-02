using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace HPA.SurveyFlow.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDashboards : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "dashboards",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    name = table.Column<string>(type: "text", nullable: false),
                    slug = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    visibility = table.Column<string>(type: "text", nullable: false, defaultValue: "restricted"),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_by_user_id = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_dashboards", x => x.id);
                    table.ForeignKey(
                        name: "FK_dashboards_users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "dashboard_cards",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    dashboard_id = table.Column<int>(type: "integer", nullable: false),
                    report_template_id = table.Column<int>(type: "integer", nullable: false),
                    title_override = table.Column<string>(type: "text", nullable: true),
                    x = table.Column<int>(type: "integer", nullable: false),
                    y = table.Column<int>(type: "integer", nullable: false),
                    w = table.Column<int>(type: "integer", nullable: false, defaultValue: 6),
                    h = table.Column<int>(type: "integer", nullable: false, defaultValue: 4),
                    min_w = table.Column<int>(type: "integer", nullable: true),
                    min_h = table.Column<int>(type: "integer", nullable: true),
                    max_w = table.Column<int>(type: "integer", nullable: true),
                    max_h = table.Column<int>(type: "integer", nullable: true),
                    settings_json = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_dashboard_cards", x => x.id);
                    table.ForeignKey(
                        name: "FK_dashboard_cards_dashboards_dashboard_id",
                        column: x => x.dashboard_id,
                        principalTable: "dashboards",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_dashboard_cards_report_templates_report_template_id",
                        column: x => x.report_template_id,
                        principalTable: "report_templates",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_dashboard_cards_dashboard_id",
                table: "dashboard_cards",
                column: "dashboard_id");

            migrationBuilder.CreateIndex(
                name: "IX_dashboard_cards_report_template_id",
                table: "dashboard_cards",
                column: "report_template_id");

            migrationBuilder.CreateIndex(
                name: "IX_dashboards_created_by_user_id",
                table: "dashboards",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_dashboards_slug",
                table: "dashboards",
                column: "slug",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "dashboard_cards");

            migrationBuilder.DropTable(
                name: "dashboards");
        }
    }
}
