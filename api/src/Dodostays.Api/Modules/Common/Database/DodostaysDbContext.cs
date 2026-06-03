using Microsoft.EntityFrameworkCore;

namespace Dodostays.Api.Modules.Common.Database;

public partial class DodostaysDbContext : DbContext
{
    public DodostaysDbContext(DbContextOptions<DodostaysDbContext> options) : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasPostgresExtension("postgis");
        base.OnModelCreating(modelBuilder);
    }
}
