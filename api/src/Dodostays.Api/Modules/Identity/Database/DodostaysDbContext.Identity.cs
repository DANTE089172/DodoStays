using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Modules.Identity.Domain;

namespace Dodostays.Api.Modules.Common.Database;

public partial class DodostaysDbContext
{
    public DbSet<HostProfile> HostProfiles => Set<HostProfile>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<KycRecord> KycRecords => Set<KycRecord>();

    private static void OnModelCreatingIdentity(ModelBuilder modelBuilder)
    {
        Modules.Identity.Database.IdentityEntityConfigurations.Apply(modelBuilder);
    }
}
