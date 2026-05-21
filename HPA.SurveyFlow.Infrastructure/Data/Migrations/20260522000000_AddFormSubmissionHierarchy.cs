using HPA.SurveyFlow.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HPA.SurveyFlow.Infrastructure.Data.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260522000000_AddFormSubmissionHierarchy")]
    public partial class AddFormSubmissionHierarchy : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "parent_form_id",
                table: "forms",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "parent_submission_id",
                table: "form_submissions",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_forms_parent_form_id",
                table: "forms",
                column: "parent_form_id");

            migrationBuilder.CreateIndex(
                name: "IX_form_submissions_parent_submission_id",
                table: "form_submissions",
                column: "parent_submission_id");

            migrationBuilder.AddForeignKey(
                name: "FK_forms_forms_parent_form_id",
                table: "forms",
                column: "parent_form_id",
                principalTable: "forms",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_form_submissions_form_submissions_parent_submission_id",
                table: "form_submissions",
                column: "parent_submission_id",
                principalTable: "form_submissions",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_forms_forms_parent_form_id",
                table: "forms");

            migrationBuilder.DropForeignKey(
                name: "FK_form_submissions_form_submissions_parent_submission_id",
                table: "form_submissions");

            migrationBuilder.DropIndex(
                name: "IX_forms_parent_form_id",
                table: "forms");

            migrationBuilder.DropIndex(
                name: "IX_form_submissions_parent_submission_id",
                table: "form_submissions");

            migrationBuilder.DropColumn(
                name: "parent_form_id",
                table: "forms");

            migrationBuilder.DropColumn(
                name: "parent_submission_id",
                table: "form_submissions");
        }
    }
}
