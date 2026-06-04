using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Modules.Listings.Domain;

namespace Dodostays.Api.Modules.Common.Database;

public partial class DodostaysDbContext
{
    public DbSet<Listing> Listings => Set<Listing>();
    public DbSet<ListingPhoto> ListingPhotos => Set<ListingPhoto>();

    private static void OnModelCreatingListings(ModelBuilder modelBuilder)
    {
        Modules.Listings.Database.ListingEntityConfigurations.Apply(modelBuilder);
    }
}
