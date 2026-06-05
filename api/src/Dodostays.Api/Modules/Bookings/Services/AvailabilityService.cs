using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Contracts.Bookings;
using Dodostays.Api.Modules.Common.Database;

namespace Dodostays.Api.Modules.Bookings.Services;

public sealed class AvailabilityService
{
    private readonly DodostaysDbContext _db;

    public AvailabilityService(DodostaysDbContext db) => _db = db;

    public async Task<AvailabilityResponse> CheckAsync(Guid listingId, DateRange dates, CancellationToken ct)
    {
        var conflicts = new List<DateRange>();

        // Confirmed/CheckedIn/Completed bookings (active, non-cancelled)
        var bookingConflicts = await _db.Bookings
            .Where(b => b.ListingId == listingId
                && b.State != BookingState.Cancelled
                && b.CheckIn < dates.CheckOut
                && dates.CheckIn < b.CheckOut)
            .Select(b => new { b.CheckIn, b.CheckOut })
            .ToListAsync(ct);
        conflicts.AddRange(bookingConflicts.Select(b => new DateRange(b.CheckIn, b.CheckOut)));

        // Active holds
        var now = DateTimeOffset.UtcNow;
        var holdConflicts = await _db.BookingHolds
            .Where(h => h.ListingId == listingId
                && h.ExpiresAt > now
                && h.CheckIn < dates.CheckOut
                && dates.CheckIn < h.CheckOut)
            .Select(h => new { h.CheckIn, h.CheckOut })
            .ToListAsync(ct);
        conflicts.AddRange(holdConflicts.Select(h => new DateRange(h.CheckIn, h.CheckOut)));

        // External calendar blocks
        var externalConflicts = await _db.ExternalCalendarBlocks
            .Where(e => e.ListingId == listingId
                && e.CheckIn < dates.CheckOut
                && dates.CheckIn < e.CheckOut)
            .Select(e => new { e.CheckIn, e.CheckOut })
            .ToListAsync(ct);
        conflicts.AddRange(externalConflicts.Select(e => new DateRange(e.CheckIn, e.CheckOut)));

        return new AvailabilityResponse(
            ListingId: listingId,
            From: dates.CheckIn,
            To: dates.CheckOut,
            IsAvailable: conflicts.Count == 0,
            ConflictingRanges: conflicts);
    }

    public async Task<bool> IsAvailableAsync(Guid listingId, DateRange dates, CancellationToken ct)
    {
        var r = await CheckAsync(listingId, dates, ct);
        return r.IsAvailable;
    }
}
