using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Contracts.Listings;
using Dodostays.Api.Contracts.Search;
using Dodostays.Api.Modules.Common.Database;
using Dodostays.Api.Modules.Listings.Domain;
using Dodostays.Api.Modules.Search.DriveTime;

namespace Dodostays.Api.Modules.Listings.Services;

public sealed class ListingSearchService
{
    private readonly DodostaysDbContext _db;
    private readonly IDriveTimeService _driveTime;

    public ListingSearchService(DodostaysDbContext db, IDriveTimeService driveTime)
    {
        _db = db;
        _driveTime = driveTime;
    }

    public async Task<ListingSearchResponse> SearchAsync(ListingSearchRequest request, CancellationToken ct)
    {
        var query = _db.Listings
            .Include(l => l.Photos)
            .AsNoTracking()
            .Where(l => l.Status == ListingStatus.Published);

        if (!string.IsNullOrWhiteSpace(request.Region))
        {
            var slug = request.Region.Trim().ToLowerInvariant();
            query = query.Where(l => l.Region == slug);
        }
        if (request.PropertyType.HasValue)
            query = query.Where(l => l.PropertyType == request.PropertyType.Value);
        if (request.MinBedrooms.HasValue)
            query = query.Where(l => l.Bedrooms >= request.MinBedrooms.Value);
        if (request.MinGuests.HasValue)
            query = query.Where(l => l.MaxGuests >= request.MinGuests.Value);
        if (request.MaxNightlyMur.HasValue)
            query = query.Where(l => l.NightlyRateMur <= request.MaxNightlyMur.Value);
        if (request.MinNightlyMur.HasValue)
            query = query.Where(l => l.NightlyRateMur >= request.MinNightlyMur.Value);
        if (request.VerifiedOnly)
            query = query.Where(l => l.Tier == ListingTier.Verified);

        if (request.BoundingBox is not null)
        {
            var bb = request.BoundingBox;
            query = query.Where(l =>
                l.Latitude >= bb.SouthLat && l.Latitude <= bb.NorthLat &&
                l.Longitude >= bb.WestLng && l.Longitude <= bb.EastLng);
        }

        var rawItems = await query
            .OrderByDescending(l => l.CreatedAt) // base ordering; may be replaced below
            .Select(l => new
            {
                l.Id, l.Title, l.PropertyType, l.Tier, l.Region,
                l.Bedrooms, l.Beds, l.MaxGuests, l.NightlyRateMur,
                PrimaryPhotoUrl = l.Photos.OrderBy(p => p.SortOrder).Select(p => p.PublicUrl).FirstOrDefault(),
                l.CreatedAt, l.Latitude, l.Longitude, l.Description, l.Amenities
            })
            .ToListAsync(ct);

        // Client-side amenity filter (Plan 02a workaround for value converter)
        if (request.RequiredAmenities is { Count: > 0 })
        {
            rawItems = rawItems.Where(it => request.RequiredAmenities!.All(a => it.Amenities.Contains(a))).ToList();
        }

        // Classify vibe + price band per row
        var withVibe = rawItems.Select(it => new
        {
            it.Id, it.Title, it.PropertyType, it.Tier, it.Region,
            it.Bedrooms, it.Beds, it.MaxGuests, it.NightlyRateMur, it.PrimaryPhotoUrl,
            it.CreatedAt, it.Latitude, it.Longitude,
            Vibe = ListingVibeClassifier.Classify(it.Region, it.Description, it.Amenities),
            PriceBand = ListingVibeClassifier.PriceBandFor(it.NightlyRateMur)
        }).ToList();

        // Anchor-aware sort: compute drive-time per listing; min across anchors
        var driveTimes = new Dictionary<Guid, int?>();
        if (request.Anchors is { Count: > 0 })
        {
            foreach (var it in withVibe)
            {
                var mins = await _driveTime.EstimateMinutesAsync(it.Latitude, it.Longitude, request.Anchors, ct);
                driveTimes[it.Id] = mins == int.MaxValue ? (int?)null : mins;
            }
            withVibe = withVibe
                .OrderBy(it => driveTimes.TryGetValue(it.Id, out var v) ? (v ?? int.MaxValue) : int.MaxValue)
                .ToList();
        }
        else
        {
            withVibe = request.Sort switch
            {
                "price-asc" => withVibe.OrderBy(it => it.NightlyRateMur).ToList(),
                "price-desc" => withVibe.OrderByDescending(it => it.NightlyRateMur).ToList(),
                _ => withVibe.OrderByDescending(it => it.CreatedAt).ToList(),
            };
        }

        int? DriveFor(Guid id) => driveTimes.TryGetValue(id, out var v) ? v : (int?)null;

        var total = withVibe.Count;
        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 50);

        var paged = withVibe.Skip((page - 1) * pageSize).Take(pageSize)
            .Select(it => new ListingSummaryDto(
                it.Id, it.Title, it.PropertyType, it.Tier, it.Region,
                it.Bedrooms, it.Beds, it.MaxGuests, it.NightlyRateMur,
                it.PrimaryPhotoUrl, it.CreatedAt,
                it.Latitude, it.Longitude,
                it.Vibe, it.PriceBand,
                DriveFor(it.Id)))
            .ToList();

        var totalPages = (int)Math.Ceiling(total / (double)pageSize);
        return new ListingSearchResponse(paged, page, pageSize, total, Math.Max(1, totalPages));
    }
}
