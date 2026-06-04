using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Contracts.Listings;
using Dodostays.Api.Modules.Common.Database;
using Dodostays.Api.Modules.Listings.Domain;
using Dodostays.Api.Modules.Listings.Storage;

namespace Dodostays.Api.Modules.Listings.Services;

public sealed class ListingService
{
    private readonly DodostaysDbContext _db;
    private readonly IPhotoStorage _storage;
    private static readonly GeometryFactory GeoFactory = new(new PrecisionModel(), 4326);

    public ListingService(DodostaysDbContext db, IPhotoStorage storage)
    {
        _db = db;
        _storage = storage;
    }

    public async Task<ListingDto> CreateAsync(Guid hostUserId, CreateListingRequest req, CancellationToken ct)
    {
        var user = await _db.Users.SingleAsync(u => u.Id == hostUserId, ct);
        if (user.Role != UserRole.Host)
        {
            user.Role = UserRole.Host;
        }

        var listing = new Listing
        {
            HostUserId = hostUserId,
            Title = req.Title.Trim(),
            Description = req.Description.Trim(),
            PropertyType = req.PropertyType,
            Tier = ListingTier.Standard,
            Status = ListingStatus.Draft,
            Region = req.Region.Trim().ToLowerInvariant(),
            AddressLine = req.AddressLine.Trim(),
            Latitude = req.Latitude,
            Longitude = req.Longitude,
            Location = GeoFactory.CreatePoint(new Coordinate(req.Longitude, req.Latitude)),
            Bedrooms = req.Bedrooms,
            Beds = req.Beds,
            Bathrooms = req.Bathrooms,
            MaxGuests = req.MaxGuests,
            NightlyRateMur = req.NightlyRateMur,
            CleaningFeeMur = req.CleaningFeeMur,
            MinStayNights = req.MinStayNights,
            Amenities = req.Amenities.Distinct().ToList()
        };

        _db.Listings.Add(listing);
        await _db.SaveChangesAsync(ct);

        return await ToDtoAsync(listing.Id, ct);
    }

    public async Task<ListingDto> UpdateAsync(Guid hostUserId, Guid listingId, UpdateListingRequest req, CancellationToken ct)
    {
        var listing = await _db.Listings.SingleOrDefaultAsync(l => l.Id == listingId, ct)
            ?? throw new KeyNotFoundException("Listing not found.");
        if (listing.HostUserId != hostUserId)
            throw new UnauthorizedAccessException("You do not own this listing.");

        listing.Title = req.Title.Trim();
        listing.Description = req.Description.Trim();
        listing.PropertyType = req.PropertyType;
        listing.Region = req.Region.Trim().ToLowerInvariant();
        listing.AddressLine = req.AddressLine.Trim();
        listing.Latitude = req.Latitude;
        listing.Longitude = req.Longitude;
        listing.Location = GeoFactory.CreatePoint(new Coordinate(req.Longitude, req.Latitude));
        listing.Bedrooms = req.Bedrooms;
        listing.Beds = req.Beds;
        listing.Bathrooms = req.Bathrooms;
        listing.MaxGuests = req.MaxGuests;
        listing.NightlyRateMur = req.NightlyRateMur;
        listing.CleaningFeeMur = req.CleaningFeeMur;
        listing.MinStayNights = req.MinStayNights;
        listing.Amenities = req.Amenities.Distinct().ToList();
        listing.Touch();

        await _db.SaveChangesAsync(ct);
        return await ToDtoAsync(listingId, ct);
    }

    public async Task DeleteAsync(Guid hostUserId, Guid listingId, CancellationToken ct)
    {
        var listing = await _db.Listings.Include(l => l.Photos).SingleOrDefaultAsync(l => l.Id == listingId, ct)
            ?? throw new KeyNotFoundException("Listing not found.");
        if (listing.HostUserId != hostUserId)
            throw new UnauthorizedAccessException("You do not own this listing.");

        foreach (var photo in listing.Photos)
        {
            await _storage.DeleteAsync(photo.StoragePath, ct);
        }
        _db.Listings.Remove(listing);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<ListingDto> PublishAsync(Guid hostUserId, Guid listingId, CancellationToken ct)
    {
        var listing = await _db.Listings.SingleOrDefaultAsync(l => l.Id == listingId, ct)
            ?? throw new KeyNotFoundException("Listing not found.");
        if (listing.HostUserId != hostUserId)
            throw new UnauthorizedAccessException("You do not own this listing.");
        listing.Publish();
        await _db.SaveChangesAsync(ct);
        return await ToDtoAsync(listingId, ct);
    }

    public async Task<ListingDto> UnpublishAsync(Guid hostUserId, Guid listingId, CancellationToken ct)
    {
        var listing = await _db.Listings.SingleOrDefaultAsync(l => l.Id == listingId, ct)
            ?? throw new KeyNotFoundException("Listing not found.");
        if (listing.HostUserId != hostUserId)
            throw new UnauthorizedAccessException("You do not own this listing.");
        listing.Unpublish();
        await _db.SaveChangesAsync(ct);
        return await ToDtoAsync(listingId, ct);
    }

    public async Task<ListingDto?> GetAsync(Guid listingId, bool includeUnpublished, CancellationToken ct)
    {
        var listing = await _db.Listings
            .Include(l => l.Photos.OrderBy(p => p.SortOrder))
            .AsNoTracking()
            .SingleOrDefaultAsync(l => l.Id == listingId, ct);
        if (listing is null) return null;
        if (!includeUnpublished && listing.Status != ListingStatus.Published) return null;
        return await ToDtoFromEntityAsync(listing, ct);
    }

    public async Task<IReadOnlyList<ListingDto>> GetMineAsync(Guid hostUserId, CancellationToken ct)
    {
        var listings = await _db.Listings
            .Include(l => l.Photos.OrderBy(p => p.SortOrder))
            .Where(l => l.HostUserId == hostUserId)
            .OrderByDescending(l => l.CreatedAt)
            .AsNoTracking()
            .ToListAsync(ct);
        var hostName = await _db.Users.Where(u => u.Id == hostUserId).Select(u => u.DisplayName).SingleAsync(ct);
        return listings.Select(l => MapToDto(l, hostName)).ToList();
    }

    private async Task<ListingDto> ToDtoAsync(Guid id, CancellationToken ct)
    {
        var listing = await _db.Listings
            .Include(l => l.Photos.OrderBy(p => p.SortOrder))
            .AsNoTracking()
            .SingleAsync(l => l.Id == id, ct);
        return await ToDtoFromEntityAsync(listing, ct);
    }

    private async Task<ListingDto> ToDtoFromEntityAsync(Listing listing, CancellationToken ct)
    {
        var hostName = await _db.Users.Where(u => u.Id == listing.HostUserId).Select(u => u.DisplayName).SingleAsync(ct);
        return MapToDto(listing, hostName);
    }

    public static ListingDto MapToDto(Listing listing, string hostName)
    {
        var photos = listing.Photos
            .OrderBy(p => p.SortOrder)
            .Select(p => new ListingPhotoDto(p.Id, p.PublicUrl, p.Caption, p.SortOrder))
            .ToList();
        return new ListingDto(
            listing.Id,
            listing.HostUserId,
            hostName,
            listing.Title,
            listing.Description,
            listing.PropertyType,
            listing.Tier,
            listing.Status,
            listing.Region,
            listing.AddressLine,
            listing.Latitude,
            listing.Longitude,
            listing.Bedrooms,
            listing.Beds,
            listing.Bathrooms,
            listing.MaxGuests,
            listing.NightlyRateMur,
            listing.CleaningFeeMur,
            listing.MinStayNights,
            listing.Amenities.AsReadOnly(),
            photos,
            listing.CreatedAt,
            listing.PublishedAt);
    }
}
