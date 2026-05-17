using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HPA.SurveyFlow.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSecondarySubmitToFormSubmission : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "secondary_submit_at",
                table: "form_submissions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "secondary_submit_response",
                table: "form_submissions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "secondary_submit_status",
                table: "form_submissions",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "secondary_submit_at",
                table: "form_submissions");

            migrationBuilder.DropColumn(
                name: "secondary_submit_response",
                table: "form_submissions");

            migrationBuilder.DropColumn(
                name: "secondary_submit_status",
                table: "form_submissions");
        }
    }
}
