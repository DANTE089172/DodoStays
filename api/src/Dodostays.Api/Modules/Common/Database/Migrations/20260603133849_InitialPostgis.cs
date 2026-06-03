using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Dodostays.Api.Modules.Common.Database.Migrations
{
    /// <inheritdoc />
    public partial class InitialPostgis : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:postgis", ",,");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
