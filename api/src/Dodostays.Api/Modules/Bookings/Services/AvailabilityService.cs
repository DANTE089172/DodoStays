using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Contracts.Bookings;
using Dodostays.Api.Modules.Common.Database;

namespace Dodostays.Api.Modules.Bookings.Services;

public sealed class AvailabilityService
{
    private readonly DodostaysDbContext _db;

    public AvailabilityService(DodostaysDbContext db) => _db = db;

    public Task<AvailabilityResponse> CheckAsync(Guid listingId, DateRange dates, CancellationToken ct)
        => CheckAsync(listingId, dates, excludeBookingId: null, ct);

    /// <summary>
    /// Checks whether <paramref name="dates"/> are free for the listing. Pass
    /// <paramref name="excludeBookingId"/> to ignore a specific booking and its hold — used at
    /// confirmation time so a booking does not conflict with its own hold.
    /// </summary>
    public async Task<AvailabilityResponse> CheckAsync(Guid listingId, DateRange dates, Guid? excludeBookingId, CancellationToken ct)
    {
        var conflicts = new List<DateRange>();

        // Only *active reservations* block the calendar. A PendingPayment booking's reservation is
        // represented by its (expiring) hold below — counting the booking row here as well would
        // leave dates blocked forever after an abandoned checkout, because the hold expires but the
        // PendingPayment row lingers.
        var bookingConflicts = await _db.Bookings
            .Where(b => b.ListingId == listingId
                && (b.State == BookingState.Confirmed
                    || b.State == BookingState.CheckedIn
                    || b.State == BookingState.Completed
                    || b.State == BookingState.Disputed)
                && (excludeBookingId == null || b.Id != excludeBookingId)
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
                && (excludeBookingId == null || h.BookingId != excludeBookingId)
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
