using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace HPA.SurveyFlow.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class Phase3_ChartConfigAndDataset : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "chart_config_json",
                table: "report_templates",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "chart_type",
                table: "report_templates",
                type: "text",
                nullable: false,
                defaultValue: "table");

            migrationBuilder.AddColumn<int>(
                name: "dataset_id",
                table: "report_templates",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "datasets",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    name = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    form_id = table.Column<int>(type: "integer", nullable: false),
                    base_filters_json = table.Column<string>(type: "text", nullable: true),
                    fields_json = table.Column<string>(type: "text", nullable: true),
                    created_by = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_datasets", x => x.id);
                    table.ForeignKey(
                        name: "FK_datasets_forms_form_id",
                        column: x => x.form_id,
                        principalTable: "forms",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_datasets_users_created_by",
                        column: x => x.created_by,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_datasets_created_by",
                table: "datasets",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "IX_datasets_form_id",
                table: "datasets",
                column: "form_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "datasets");

            migrationBuilder.DropColumn(
                name: "chart_config_json",
                table: "report_templates");

            migrationBuilder.DropColumn(
                name: "chart_type",
                table: "report_templates");

            migrationBuilder.DropColumn(
                name: "dataset_id",
                table: "report_templates");
        }
    }
}
