using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Contracts.Listings;
using Dodostays.Api.Modules.Common.Database;

namespace Dodostays.Api.Modules.Listings.Services;

public sealed class ListingSearchService
{
    private readonly DodostaysDbContext _db;

    public ListingSearchService(DodostaysDbContext db) => _db = db;

    public async Task<ListingSearchResponse> SearchAsync(ListingSearchRequest request, CancellationToken ct)
    {
        var pageSize = Math.Clamp(request.PageSize, 1, 50);
        var page = Math.Max(1, request.Page);

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
        if (request.RequiredAmenities is { Count: > 0 })
        {
            foreach (var amenity in request.RequiredAmenities)
            {
                var a = amenity;
                query = query.Where(l => l.Amenities.Contains(a));
            }
        }

        query = request.Sort switch
        {
            "price-asc" => query.OrderBy(l => l.NightlyRateMur),
            "price-desc" => query.OrderByDescending(l => l.NightlyRateMur),
            _ => query.OrderByDescending(l => l.CreatedAt)
        };

        var total = await query.CountAsync(ct);
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(l => new ListingSummaryDto(
                l.Id,
                l.Title,
                l.PropertyType,
                l.Tier,
                l.Region,
                l.Bedrooms,
                l.Beds,
                l.MaxGuests,
                l.NightlyRateMur,
                l.Photos.OrderBy(p => p.SortOrder).Select(p => p.PublicUrl).FirstOrDefault(),
                l.CreatedAt))
            .ToListAsync(ct);

        var totalPages = (int)Math.Ceiling(total / (double)pageSize);
        return new ListingSearchResponse(items, page, pageSize, total, Math.Max(1, totalPages));
    }
}
