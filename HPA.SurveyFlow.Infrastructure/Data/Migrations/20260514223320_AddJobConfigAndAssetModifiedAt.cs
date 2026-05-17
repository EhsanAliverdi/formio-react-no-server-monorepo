using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HPA.SurveyFlow.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddJobConfigAndAssetModifiedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "only_update_changed",
                table: "scheduled_job_definitions",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "sync_mode",
                table: "scheduled_job_definitions",
                type: "text",
                nullable: false,
                defaultValue: "delta");

            migrationBuilder.AddColumn<DateTime>(
                name: "source_modified_at",
                table: "external_assets",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "only_update_changed",
                table: "scheduled_job_definitions");

            migrationBuilder.DropColumn(
                name: "sync_mode",
                table: "scheduled_job_definitions");

            migrationBuilder.DropColumn(
                name: "source_modified_at",
                table: "external_assets");
        }
    }
}
