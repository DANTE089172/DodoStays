using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Dodostays.Api.Modules.Common.Database.Migrations
{
    /// <inheritdoc />
    public partial class AddInvoiceCountersGapFree : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropSequence(
                name: "inv_commission_seq");

            migrationBuilder.DropSequence(
                name: "inv_credit_note_seq");

            migrationBuilder.DropSequence(
                name: "inv_guest_seq");

            migrationBuilder.CreateTable(
                name: "invoice_counters",
                columns: table => new
                {
                    kind = table.Column<int>(type: "integer", nullable: false),
                    year = table.Column<int>(type: "integer", nullable: false),
                    last_value = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_invoice_counters", x => new { x.kind, x.year });
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "invoice_counters");

            migrationBuilder.CreateSequence(
                name: "inv_commission_seq");

            migrationBuilder.CreateSequence(
                name: "inv_credit_note_seq");

            migrationBuilder.CreateSequence(
                name: "inv_guest_seq");
        }
    }
}
