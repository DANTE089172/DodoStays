using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Contracts.Bookings;
using Dodostays.Api.Modules.Bookings.Domain;
using Dodostays.Api.Modules.Common.Database;

namespace Dodostays.Api.Modules.Bookings.Services;

public sealed class BookingService
{
    private readonly DodostaysDbContext _db;

    public BookingService(DodostaysDbContext db) => _db = db;

    public async Task<BookingDto> ConfirmAsync(Guid guestUserId, Guid bookingId, string? paymentReference, CancellationToken ct)
    {
        var booking = await _db.Bookings.SingleOrDefaultAsync(b => b.Id == bookingId, ct)
            ?? throw new KeyNotFoundException("Booking not found.");
        if (booking.GuestUserId != guestUserId)
            throw new UnauthorizedAccessException("Not your booking.");
        if (booking.HoldExpiresAt < DateTimeOffset.UtcNow && booking.State == BookingState.PendingPayment)
            throw new InvalidOperationException("Hold expired — please hold dates again.");

        booking.MarkConfirmed(paymentReference);

        // The hold record can be removed; booking itself is now the source of truth
        var holds = await _db.BookingHolds.Where(h => h.BookingId == bookingId).ToListAsync(ct);
        _db.BookingHolds.RemoveRange(holds);

        await _db.SaveChangesAsync(ct);
        return await ToDtoAsync(booking, ct);
    }

    public async Task<BookingDto> CancelAsync(Guid actorUserId, Guid bookingId, string? reason, CancellationToken ct)
    {
        var booking = await _db.Bookings.SingleOrDefaultAsync(b => b.Id == bookingId, ct)
            ?? throw new KeyNotFoundException("Booking not found.");
        if (booking.GuestUserId != actorUserId && booking.HostUserId != actorUserId)
            throw new UnauthorizedAccessException("Not your booking.");

        booking.Cancel(reason);
        var holds = await _db.BookingHolds.Where(h => h.BookingId == bookingId).ToListAsync(ct);
        _db.BookingHolds.RemoveRange(holds);

        await _db.SaveChangesAsync(ct);
        return await ToDtoAsync(booking, ct);
    }

    public async Task<BookingDto> CheckInAsync(Guid hostUserId, Guid bookingId, CancellationToken ct)
    {
        var booking = await _db.Bookings.SingleOrDefaultAsync(b => b.Id == bookingId, ct)
            ?? throw new KeyNotFoundException("Booking not found.");
        if (booking.HostUserId != hostUserId)
            throw new UnauthorizedAccessException("Not your listing.");

        booking.MarkCheckedIn();
        await _db.SaveChangesAsync(ct);
        return await ToDtoAsync(booking, ct);
    }

    public async Task<BookingDto?> GetAsync(Guid bookingId, Guid actorUserId, CancellationToken ct)
    {
        var booking = await _db.Bookings.AsNoTracking().SingleOrDefaultAsync(b => b.Id == bookingId, ct);
        if (booking is null) return null;
        if (booking.GuestUserId != actorUserId && booking.HostUserId != actorUserId) return null;
        return await ToDtoAsync(booking, ct);
    }

    public async Task<IReadOnlyList<BookingSummaryDto>> GetMineAsync(Guid guestUserId, CancellationToken ct)
    {
        var rows = await _db.Bookings
            .AsNoTracking()
            .Where(b => b.GuestUserId == guestUserId)
            .OrderByDescending(b => b.CreatedAt)
            .Select(b => new
            {
                b.Id, b.ListingId, b.State, b.CheckIn, b.CheckOut, b.TotalMur, b.CreatedAt,
                Listing = _db.Listings.Where(l => l.Id == b.ListingId).Select(l => new
                {
                    l.Title,
                    PrimaryPhotoUrl = l.Photos.OrderBy(p => p.SortOrder).Select(p => p.PublicUrl).FirstOrDefault()
                }).FirstOrDefault()
            })
            .ToListAsync(ct);

        return rows.Select(r => new BookingSummaryDto(
            Id: r.Id,
            ListingId: r.ListingId,
            ListingTitle: r.Listing?.Title ?? "(deleted listing)",
            PrimaryPhotoUrl: r.Listing?.PrimaryPhotoUrl,
            State: r.State,
            Dates: new DateRange(r.CheckIn, r.CheckOut),
            TotalMur: r.TotalMur,
            CreatedAt: r.CreatedAt)).ToList();
    }

    public async Task<IReadOnlyList<BookingSummaryDto>> GetForListingAsync(Guid listingId, Guid hostUserId, CancellationToken ct)
    {
        var listing = await _db.Listings.SingleOrDefaultAsync(l => l.Id == listingId, ct)
            ?? throw new KeyNotFoundException("Listing not found.");
        if (listing.HostUserId != hostUserId)
            throw new UnauthorizedAccessException("Not your listing.");

        var rows = await _db.Bookings.AsNoTracking()
            .Where(b => b.ListingId == listingId)
            .OrderByDescending(b => b.CreatedAt)
            .Select(b => new
            {
                b.Id, b.ListingId, b.State, b.CheckIn, b.CheckOut, b.TotalMur, b.CreatedAt,
                Listing = _db.Listings.Where(l => l.Id == b.ListingId).Select(l => new
                {
                    l.Title,
                    PrimaryPhotoUrl = l.Photos.OrderBy(p => p.SortOrder).Select(p => p.PublicUrl).FirstOrDefault()
                }).FirstOrDefault()
            })
            .ToListAsync(ct);

        return rows.Select(r => new BookingSummaryDto(
            r.Id, r.ListingId,
            r.Listing?.Title ?? "(deleted listing)",
            r.Listing?.PrimaryPhotoUrl,
            r.State,
            new DateRange(r.CheckIn, r.CheckOut),
            r.TotalMur, r.CreatedAt)).ToList();
    }

    private async Task<BookingDto> ToDtoAsync(Booking b, CancellationToken ct)
    {
        var info = await _db.Listings
            .Where(l => l.Id == b.ListingId)
            .Select(l => new
            {
                l.Title,
                PrimaryPhotoUrl = l.Photos.OrderBy(p => p.SortOrder).Select(p => p.PublicUrl).FirstOrDefault(),
                HostName = _db.Users.Where(u => u.Id == l.HostUserId).Select(u => u.DisplayName).FirstOrDefault()
            })
            .SingleAsync(ct);

        var guestName = await _db.Users
            .Where(u => u.Id == b.GuestUserId)
            .Select(u => u.DisplayName)
            .SingleAsync(ct);

        return new BookingDto(
            Id: b.Id,
            ListingId: b.ListingId,
            ListingTitle: info.Title,
            PrimaryPhotoUrl: info.PrimaryPhotoUrl,
            GuestUserId: b.GuestUserId,
            GuestDisplayName: guestName,
            HostUserId: b.HostUserId,
            HostDisplayName: info.HostName ?? "(unknown)",
            State: b.State,
            Dates: new DateRange(b.CheckIn, b.CheckOut),
            NumGuests: b.NumGuests,
            NightlyRateMur: b.NightlyRateMur,
            CleaningFeeMur: b.CleaningFeeMur,
            SubtotalMur: b.SubtotalMur,
            VatMur: b.VatMur,
            TotalMur: b.TotalMur,
            CreatedAt: b.CreatedAt,
            ConfirmedAt: b.ConfirmedAt,
            CheckedInAt: b.CheckedInAt,
            CompletedAt: b.CompletedAt,
            CancelledAt: b.CancelledAt,
            CancellationReason: b.CancellationReason);
    }
}
