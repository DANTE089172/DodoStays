using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Modules.Identity.Domain;

namespace Dodostays.Api.Modules.Common.Database;

public partial class DodostaysDbContext : IdentityDbContext<DodostaysUser, DodostaysRole, Guid>
{
    public DodostaysDbContext(DbContextOptions<DodostaysDbContext> options) : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.HasPostgresExtension("postgis");
        OnModelCreatingIdentity(modelBuilder);
    }
}
