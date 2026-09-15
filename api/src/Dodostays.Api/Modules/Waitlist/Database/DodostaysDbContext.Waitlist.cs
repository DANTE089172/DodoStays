using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Modules.Waitlist.Domain;

namespace Dodostays.Api.Modules.Common.Database;

public partial class DodostaysDbContext
{
    public DbSet<WaitlistSignup> WaitlistSignups => Set<WaitlistSignup>();

    private static void OnModelCreatingWaitlist(ModelBuilder modelBuilder)
    {
        Modules.Waitlist.Database.WaitlistEntityConfigurations.Apply(modelBuilder);
    }
}
