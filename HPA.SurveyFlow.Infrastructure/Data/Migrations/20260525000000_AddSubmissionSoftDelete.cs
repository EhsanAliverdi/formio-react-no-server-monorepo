using HPA.SurveyFlow.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HPA.SurveyFlow.Infrastructure.Data.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260525000000_AddSubmissionSoftDelete")]
    public partial class AddSubmissionSoftDelete : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "form_submissions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "deleted_by",
                table: "form_submissions",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "delete_reason",
                table: "form_submissions",
                type: "text",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_form_submissions_deleted_by",
                table: "form_submissions",
                column: "deleted_by");

            migrationBuilder.AddForeignKey(
                name: "FK_form_submissions_users_deleted_by",
                table: "form_submissions",
                column: "deleted_by",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_form_submissions_users_deleted_by",
                table: "form_submissions");

            migrationBuilder.DropIndex(
                name: "IX_form_submissions_deleted_by",
                table: "form_submissions");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "form_submissions");

            migrationBuilder.DropColumn(
                name: "deleted_by",
                table: "form_submissions");

            migrationBuilder.DropColumn(
                name: "delete_reason",
                table: "form_submissions");
        }
    }
}
