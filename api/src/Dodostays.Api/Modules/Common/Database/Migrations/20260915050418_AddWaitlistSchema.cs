using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Dodostays.Api.Modules.Common.Database.Migrations
{
    /// <inheritdoc />
    public partial class AddWaitlistSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "waitlist_signups",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    Audience = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Region = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    Message = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    Locale = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    Source = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_waitlist_signups", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_waitlist_signups_CreatedAt",
                table: "waitlist_signups",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_waitlist_signups_Email_Audience",
                table: "waitlist_signups",
                columns: new[] { "Email", "Audience" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "waitlist_signups");
        }
    }
}
