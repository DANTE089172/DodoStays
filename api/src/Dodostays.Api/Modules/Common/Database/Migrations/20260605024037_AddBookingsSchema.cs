using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Dodostays.Api.Modules.Common.Database.Migrations
{
    /// <inheritdoc />
    public partial class AddBookingsSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Bookings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ListingId = table.Column<Guid>(type: "uuid", nullable: false),
                    GuestUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    HostUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    State = table.Column<int>(type: "integer", nullable: false),
                    CheckIn = table.Column<DateOnly>(type: "date", nullable: false),
                    CheckOut = table.Column<DateOnly>(type: "date", nullable: false),
                    NumGuests = table.Column<int>(type: "integer", nullable: false),
                    NightlyRateMur = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    CleaningFeeMur = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    SubtotalMur = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    VatMur = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    TotalMur = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    PaymentReference = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    CancellationReason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    HoldExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ConfirmedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CheckedInAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CompletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CancelledAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Bookings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ExternalCalendarBlocks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ListingId = table.Column<Guid>(type: "uuid", nullable: false),
                    FeedId = table.Column<Guid>(type: "uuid", nullable: false),
                    ExternalUid = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    CheckIn = table.Column<DateOnly>(type: "date", nullable: false),
                    CheckOut = table.Column<DateOnly>(type: "date", nullable: false),
                    Summary = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    SyncedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExternalCalendarBlocks", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ExternalCalendarFeeds",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ListingId = table.Column<Guid>(type: "uuid", nullable: false),
                    Source = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Url = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    LastSyncedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LastError = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExternalCalendarFeeds", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BookingHolds",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BookingId = table.Column<Guid>(type: "uuid", nullable: false),
                    ListingId = table.Column<Guid>(type: "uuid", nullable: false),
                    CheckIn = table.Column<DateOnly>(type: "date", nullable: false),
                    CheckOut = table.Column<DateOnly>(type: "date", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BookingHolds", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BookingHolds_Bookings_BookingId",
                        column: x => x.BookingId,
                        principalTable: "Bookings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BookingHolds_BookingId",
                table: "BookingHolds",
                column: "BookingId");

            migrationBuilder.CreateIndex(
                name: "IX_BookingHolds_ExpiresAt",
                table: "BookingHolds",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_BookingHolds_ListingId_CheckIn_CheckOut",
                table: "BookingHolds",
                columns: new[] { "ListingId", "CheckIn", "CheckOut" });

            migrationBuilder.CreateIndex(
                name: "IX_Bookings_GuestUserId",
                table: "Bookings",
                column: "GuestUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Bookings_HostUserId",
                table: "Bookings",
                column: "HostUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Bookings_ListingId",
                table: "Bookings",
                column: "ListingId");

            migrationBuilder.CreateIndex(
                name: "IX_Bookings_ListingId_CheckIn_CheckOut",
                table: "Bookings",
                columns: new[] { "ListingId", "CheckIn", "CheckOut" });

            migrationBuilder.CreateIndex(
                name: "IX_Bookings_ListingId_State",
                table: "Bookings",
                columns: new[] { "ListingId", "State" });

            migrationBuilder.CreateIndex(
                name: "IX_ExternalCalendarBlocks_FeedId",
                table: "ExternalCalendarBlocks",
                column: "FeedId");

            migrationBuilder.CreateIndex(
                name: "IX_ExternalCalendarBlocks_FeedId_ExternalUid",
                table: "ExternalCalendarBlocks",
                columns: new[] { "FeedId", "ExternalUid" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ExternalCalendarBlocks_ListingId",
                table: "ExternalCalendarBlocks",
                column: "ListingId");

            migrationBuilder.CreateIndex(
                name: "IX_ExternalCalendarBlocks_ListingId_CheckIn_CheckOut",
                table: "ExternalCalendarBlocks",
                columns: new[] { "ListingId", "CheckIn", "CheckOut" });

            migrationBuilder.CreateIndex(
                name: "IX_ExternalCalendarFeeds_ListingId",
                table: "ExternalCalendarFeeds",
                column: "ListingId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BookingHolds");

            migrationBuilder.DropTable(
                name: "ExternalCalendarBlocks");

            migrationBuilder.DropTable(
                name: "ExternalCalendarFeeds");

            migrationBuilder.DropTable(
                name: "Bookings");
        }
    }
}
