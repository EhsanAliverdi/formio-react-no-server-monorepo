using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace HPA.SurveyFlow.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddFormIntegrationRules : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "form_integration_rules",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    form_id = table.Column<int>(type: "integer", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    enabled = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    channel = table.Column<string>(type: "text", nullable: false, defaultValue: "mex"),
                    condition_group_json = table.Column<string>(type: "text", nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_form_integration_rules", x => x.id);
                    table.ForeignKey(
                        name: "FK_form_integration_rules_forms_form_id",
                        column: x => x.form_id,
                        principalTable: "forms",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "form_integration_rule_mex",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    rule_id = table.Column<int>(type: "integer", nullable: false),
                    action = table.Column<string>(type: "text", nullable: false, defaultValue: "create_request"),
                    contact_id_field = table.Column<string>(type: "text", nullable: true),
                    job_type_field = table.Column<string>(type: "text", nullable: true),
                    field_mappings_json = table.Column<string>(type: "text", nullable: false, defaultValue: "{}")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_form_integration_rule_mex", x => x.id);
                    table.ForeignKey(
                        name: "FK_form_integration_rule_mex_form_integration_rules_rule_id",
                        column: x => x.rule_id,
                        principalTable: "form_integration_rules",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "form_integration_rule_webhooks",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    rule_id = table.Column<int>(type: "integer", nullable: false),
                    url = table.Column<string>(type: "text", nullable: false, defaultValue: ""),
                    method = table.Column<string>(type: "text", nullable: false, defaultValue: "POST"),
                    headers_json = table.Column<string>(type: "text", nullable: false, defaultValue: "[]"),
                    body_template = table.Column<string>(type: "text", nullable: false, defaultValue: "")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_form_integration_rule_webhooks", x => x.id);
                    table.ForeignKey(
                        name: "FK_form_integration_rule_webhooks_form_integration_rules_rule_~",
                        column: x => x.rule_id,
                        principalTable: "form_integration_rules",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_form_integration_rule_mex_rule_id",
                table: "form_integration_rule_mex",
                column: "rule_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_form_integration_rule_webhooks_rule_id",
                table: "form_integration_rule_webhooks",
                column: "rule_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_form_integration_rules_form_id",
                table: "form_integration_rules",
                column: "form_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "form_integration_rule_mex");

            migrationBuilder.DropTable(
                name: "form_integration_rule_webhooks");

            migrationBuilder.DropTable(
                name: "form_integration_rules");
        }
    }
}
