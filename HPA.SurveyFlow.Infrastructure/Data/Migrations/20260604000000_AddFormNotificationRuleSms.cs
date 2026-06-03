using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace HPA.SurveyFlow.Infrastructure.Data.Migrations;

public partial class AddFormNotificationRuleSms : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "form_notification_rule_sms",
            columns: table => new
            {
                id = table.Column<int>(type: "integer", nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                rule_id = table.Column<int>(type: "integer", nullable: false),
                to_numbers_json = table.Column<string>(type: "text", nullable: false, defaultValue: "[]"),
                body = table.Column<string>(type: "text", nullable: false, defaultValue: "")
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_form_notification_rule_sms", x => x.id);
                table.ForeignKey(
                    name: "FK_form_notification_rule_sms_form_notification_rules_rule_id",
                    column: x => x.rule_id,
                    principalTable: "form_notification_rules",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_form_notification_rule_sms_rule_id",
            table: "form_notification_rule_sms",
            column: "rule_id",
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "form_notification_rule_sms");
    }
}
