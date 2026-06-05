using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Contracts.Bookings;
using Dodostays.Api.Modules.Common.Database;

namespace Dodostays.Api.Modules.Bookings.Services;

public sealed class CalendarService
{
    private readonly DodostaysDbContext _db;

    public CalendarService(DodostaysDbContext db) => _db = db;

    public async Task<CalendarDto> GetMonthAsync(Guid listingId, Guid hostUserId, int year, int month, CancellationToken ct)
    {
        var listing = await _db.Listings.SingleOrDefaultAsync(l => l.Id == listingId, ct)
            ?? throw new KeyNotFoundException("Listing not found.");
        if (listing.HostUserId != hostUserId)
            throw new UnauthorizedAccessException("Not your listing.");

        var firstDay = new DateOnly(year, month, 1);
        var nextMonth = firstDay.AddMonths(1);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var bookings = await _db.Bookings.AsNoTracking()
            .Where(b => b.ListingId == listingId
                && b.State != BookingState.Cancelled
                && b.CheckIn < nextMonth
                && firstDay < b.CheckOut)
            .Select(b => new { b.Id, b.CheckIn, b.CheckOut })
            .ToListAsync(ct);

        var holds = await _db.BookingHolds.AsNoTracking()
            .Where(h => h.ListingId == listingId
                && h.ExpiresAt > DateTimeOffset.UtcNow
                && h.CheckIn < nextMonth
                && firstDay < h.CheckOut)
            .Select(h => new { h.CheckIn, h.CheckOut })
            .ToListAsync(ct);

        var feedSourceLookup = await _db.ExternalCalendarFeeds.AsNoTracking()
            .Where(f => f.ListingId == listingId)
            .ToDictionaryAsync(f => f.Id, f => f.Source, ct);

        var external = await _db.ExternalCalendarBlocks.AsNoTracking()
            .Where(e => e.ListingId == listingId
                && e.CheckIn < nextMonth
                && firstDay < e.CheckOut)
            .Select(e => new { e.FeedId, e.CheckIn, e.CheckOut })
            .ToListAsync(ct);

        var days = new List<CalendarDayDto>();
        for (var d = firstDay; d < nextMonth; d = d.AddDays(1))
        {
            CalendarDayStatus status;
            Guid? bookingId = null;
            string? source = null;

            if (d < today)
            {
                status = CalendarDayStatus.Past;
            }
            else if (bookings.FirstOrDefault(b => b.CheckIn <= d && d < b.CheckOut) is { } booked)
            {
                status = CalendarDayStatus.BookedInternal;
                bookingId = booked.Id;
            }
            else if (external.FirstOrDefault(e => e.CheckIn <= d && d < e.CheckOut) is { } ext)
            {
                status = CalendarDayStatus.BookedExternal;
                source = feedSourceLookup.TryGetValue(ext.FeedId, out var s) ? s : "External";
            }
            else if (holds.Any(h => h.CheckIn <= d && d < h.CheckOut))
            {
                status = CalendarDayStatus.Held;
            }
            else
            {
                status = CalendarDayStatus.Free;
            }

            days.Add(new CalendarDayDto(d, status, bookingId, source));
        }

        return new CalendarDto(listingId, year, month, days);
    }
}
