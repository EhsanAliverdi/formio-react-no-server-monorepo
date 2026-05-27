using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace HPA.SurveyFlow.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddFormNotificationRules : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "form_notification_rules",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    form_id = table.Column<int>(type: "integer", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    enabled = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    channel = table.Column<string>(type: "text", nullable: false, defaultValue: "email"),
                    condition_group_json = table.Column<string>(type: "text", nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_form_notification_rules", x => x.id);
                    table.ForeignKey(
                        name: "FK_form_notification_rules_forms_form_id",
                        column: x => x.form_id,
                        principalTable: "forms",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "form_notification_rule_emails",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    rule_id = table.Column<int>(type: "integer", nullable: false),
                    to_addresses_json = table.Column<string>(type: "text", nullable: false, defaultValue: "[]"),
                    subject = table.Column<string>(type: "text", nullable: false, defaultValue: ""),
                    body_html = table.Column<string>(type: "text", nullable: false, defaultValue: ""),
                    attach_pdf = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_form_notification_rule_emails", x => x.id);
                    table.ForeignKey(
                        name: "FK_form_notification_rule_emails_form_notification_rules_rule_~",
                        column: x => x.rule_id,
                        principalTable: "form_notification_rules",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_form_notification_rule_emails_rule_id",
                table: "form_notification_rule_emails",
                column: "rule_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_form_notification_rules_form_id",
                table: "form_notification_rules",
                column: "form_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "form_notification_rule_emails");

            migrationBuilder.DropTable(
                name: "form_notification_rules");
        }
    }
}
