using NetTopologySuite.Geometries;
using Dodostays.Api.Contracts.Listings;

namespace Dodostays.Api.Modules.Listings.Domain;

public class Listing
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid HostUserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public PropertyType PropertyType { get; set; }
    public ListingTier Tier { get; set; } = ListingTier.Standard;
    public ListingStatus Status { get; set; } = ListingStatus.Draft;
    public string Region { get; set; } = string.Empty;
    public string AddressLine { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public Point Location { get; set; } = default!;
    public int Bedrooms { get; set; }
    public int Beds { get; set; }
    public int Bathrooms { get; set; }
    public int MaxGuests { get; set; }
    public decimal NightlyRateMur { get; set; }
    public decimal CleaningFeeMur { get; set; }
    public int MinStayNights { get; set; } = 1;
    public List<Amenity> Amenities { get; set; } = new();
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? PublishedAt { get; set; }
    public List<ListingPhoto> Photos { get; set; } = new();

    public void Touch() => UpdatedAt = DateTimeOffset.UtcNow;

    public void Publish()
    {
        Status = ListingStatus.Published;
        PublishedAt ??= DateTimeOffset.UtcNow;
        Touch();
    }

    public void Unpublish()
    {
        Status = ListingStatus.Draft;
        Touch();
    }
}
