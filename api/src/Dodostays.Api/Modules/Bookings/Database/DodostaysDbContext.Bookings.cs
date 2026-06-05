using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Modules.Bookings.Domain;

namespace Dodostays.Api.Modules.Common.Database;

public partial class DodostaysDbContext
{
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<BookingHold> BookingHolds => Set<BookingHold>();
    public DbSet<ExternalCalendarFeed> ExternalCalendarFeeds => Set<ExternalCalendarFeed>();
    public DbSet<ExternalCalendarBlock> ExternalCalendarBlocks => Set<ExternalCalendarBlock>();

    private static void OnModelCreatingBookings(ModelBuilder modelBuilder)
    {
        Modules.Bookings.Database.BookingEntityConfigurations.Apply(modelBuilder);
    }
}
