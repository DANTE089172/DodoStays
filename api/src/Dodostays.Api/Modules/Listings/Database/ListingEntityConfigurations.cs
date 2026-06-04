using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using Dodostays.Api.Contracts.Listings;
using Dodostays.Api.Modules.Listings.Domain;

namespace Dodostays.Api.Modules.Listings.Database;

internal static class ListingEntityConfigurations
{
    public static void Apply(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Listing>(b =>
        {
            b.HasKey(l => l.Id);
            b.Property(l => l.Title).IsRequired().HasMaxLength(200);
            b.Property(l => l.Description).IsRequired().HasMaxLength(5000);
            b.Property(l => l.PropertyType).HasConversion<int>();
            b.Property(l => l.Tier).HasConversion<int>();
            b.Property(l => l.Status).HasConversion<int>();
            b.Property(l => l.Region).IsRequired().HasMaxLength(64);
            b.Property(l => l.AddressLine).IsRequired().HasMaxLength(500);
            b.Property(l => l.NightlyRateMur).HasPrecision(12, 2);
            b.Property(l => l.CleaningFeeMur).HasPrecision(12, 2);
            b.Property(l => l.Location).HasColumnType("geography (Point, 4326)");
            b.Property(l => l.Amenities)
                .HasConversion(
                    v => v.Select(a => (int)a).ToArray(),
                    v => v.Select(i => (Amenity)i).ToList())
                .Metadata.SetValueComparer(new Microsoft.EntityFrameworkCore.ChangeTracking.ValueComparer<List<Amenity>>(
                    (a, b) => (a == null && b == null) || (a != null && b != null && a.SequenceEqual(b)),
                    a => a.Aggregate(0, (h, v) => HashCode.Combine(h, (int)v)),
                    a => a.ToList()));
            b.Property(l => l.Amenities).HasColumnType("integer[]");
            b.HasIndex(l => l.HostUserId);
            b.HasIndex(l => new { l.Status, l.Region });
            b.HasIndex(l => l.PropertyType);
            b.HasIndex(l => l.NightlyRateMur);
        });

        modelBuilder.Entity<ListingPhoto>(b =>
        {
            b.HasKey(p => p.Id);
            b.Property(p => p.StoragePath).IsRequired().HasMaxLength(1024);
            b.Property(p => p.PublicUrl).IsRequired().HasMaxLength(2048);
            b.Property(p => p.Caption).HasMaxLength(500);
            b.Property(p => p.ContentType).IsRequired().HasMaxLength(100);
            b.HasOne(p => p.Listing)
                .WithMany(l => l.Photos)
                .HasForeignKey(p => p.ListingId)
                .OnDelete(DeleteBehavior.Cascade);
            b.HasIndex(p => new { p.ListingId, p.SortOrder });
        });
    }
}
