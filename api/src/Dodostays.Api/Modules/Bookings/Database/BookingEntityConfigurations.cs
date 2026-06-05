using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Modules.Bookings.Domain;

namespace Dodostays.Api.Modules.Bookings.Database;

internal static class BookingEntityConfigurations
{
    public static void Apply(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Booking>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.State).HasConversion<int>();
            b.Property(x => x.CheckIn).HasColumnType("date");
            b.Property(x => x.CheckOut).HasColumnType("date");
            b.Property(x => x.NightlyRateMur).HasPrecision(12, 2);
            b.Property(x => x.CleaningFeeMur).HasPrecision(12, 2);
            b.Property(x => x.SubtotalMur).HasPrecision(12, 2);
            b.Property(x => x.VatMur).HasPrecision(12, 2);
            b.Property(x => x.TotalMur).HasPrecision(12, 2);
            b.Property(x => x.PaymentReference).HasMaxLength(128);
            b.Property(x => x.CancellationReason).HasMaxLength(1000);
            b.HasIndex(x => x.ListingId);
            b.HasIndex(x => x.GuestUserId);
            b.HasIndex(x => x.HostUserId);
            b.HasIndex(x => new { x.ListingId, x.State });
            b.HasIndex(x => new { x.ListingId, x.CheckIn, x.CheckOut });
        });

        modelBuilder.Entity<BookingHold>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.CheckIn).HasColumnType("date");
            b.Property(x => x.CheckOut).HasColumnType("date");
            b.HasOne(x => x.Booking)
                .WithMany()
                .HasForeignKey(x => x.BookingId)
                .OnDelete(DeleteBehavior.Cascade);
            b.HasIndex(x => new { x.ListingId, x.CheckIn, x.CheckOut });
            b.HasIndex(x => x.ExpiresAt);
        });

        modelBuilder.Entity<ExternalCalendarFeed>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.Source).IsRequired().HasMaxLength(64);
            b.Property(x => x.Url).IsRequired().HasMaxLength(2048);
            b.Property(x => x.LastError).HasMaxLength(2000);
            b.HasIndex(x => x.ListingId);
        });

        modelBuilder.Entity<ExternalCalendarBlock>(b =>
        {
            b.HasKey(x => x.Id);
            b.Property(x => x.ExternalUid).IsRequired().HasMaxLength(256);
            b.Property(x => x.Summary).HasMaxLength(500);
            b.Property(x => x.CheckIn).HasColumnType("date");
            b.Property(x => x.CheckOut).HasColumnType("date");
            b.HasIndex(x => x.ListingId);
            b.HasIndex(x => x.FeedId);
            b.HasIndex(x => new { x.ListingId, x.CheckIn, x.CheckOut });
            b.HasIndex(x => new { x.FeedId, x.ExternalUid }).IsUnique();
        });
    }
}
