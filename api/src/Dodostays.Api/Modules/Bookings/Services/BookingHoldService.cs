using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Contracts.Bookings;
using Dodostays.Api.Modules.Bookings.Domain;
using Dodostays.Api.Modules.Common.Database;

namespace Dodostays.Api.Modules.Bookings.Services;

public sealed class BookingHoldService
{
    private readonly DodostaysDbContext _db;
    private readonly AvailabilityService _availability;
    private readonly PricingService _pricing;

    public BookingHoldService(DodostaysDbContext db, AvailabilityService availability, PricingService pricing)
    {
        _db = db;
        _availability = availability;
        _pricing = pricing;
    }

    public async Task<HoldBookingResponse> HoldAsync(
        Guid guestUserId,
        HoldBookingRequest req,
        CancellationToken ct)
    {
        var dates = new DateRange(req.CheckIn, req.CheckOut);
        if (!dates.IsValid)
            throw new InvalidOperationException("Invalid date range.");

        var listing = await _db.Listings.SingleOrDefaultAsync(l => l.Id == req.ListingId, ct)
            ?? throw new KeyNotFoundException("Listing not found.");

        if (req.NumGuests < 1 || req.NumGuests > listing.MaxGuests)
            throw new InvalidOperationException($"Guest count must be 1..{listing.MaxGuests}.");
        if (dates.Nights < listing.MinStayNights)
            throw new InvalidOperationException($"Minimum stay is {listing.MinStayNights} night(s).");

        // Postgres advisory lock keyed on listing id (truncated to int64).
        // This serializes hold attempts on the same listing.
        var lockKey = unchecked((long)BitConverter.ToInt64(listing.Id.ToByteArray(), 0));

        await using var tx = await _db.Database.BeginTransactionAsync(ct);
        await _db.Database.ExecuteSqlInterpolatedAsync(
            $"SELECT pg_advisory_xact_lock({lockKey})", ct);

        var avail = await _availability.CheckAsync(listing.Id, dates, ct);
        if (!avail.IsAvailable)
            throw new InvalidOperationException("Dates not available.");

        var quote = _pricing.Quote(listing.NightlyRateMur, listing.CleaningFeeMur, dates);

        var booking = new Booking
        {
            ListingId = listing.Id,
            GuestUserId = guestUserId,
            HostUserId = listing.HostUserId,
            State = BookingState.PendingPayment,
            CheckIn = dates.CheckIn,
            CheckOut = dates.CheckOut,
            NumGuests = req.NumGuests,
            NightlyRateMur = listing.NightlyRateMur,
            CleaningFeeMur = listing.CleaningFeeMur,
            SubtotalMur = quote.SubtotalMur,
            VatMur = quote.VatMur,
            TotalMur = quote.TotalMur,
            HoldExpiresAt = DateTimeOffset.UtcNow.AddMinutes(15)
        };
        _db.Bookings.Add(booking);

        var hold = new BookingHold
        {
            BookingId = booking.Id,
            ListingId = listing.Id,
            CheckIn = dates.CheckIn,
            CheckOut = dates.CheckOut,
            ExpiresAt = booking.HoldExpiresAt
        };
        _db.BookingHolds.Add(hold);

        await _db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        return new HoldBookingResponse(
            BookingId: booking.Id,
            State: booking.State,
            Dates: dates,
            NumGuests: booking.NumGuests,
            NightlyRateMur: booking.NightlyRateMur,
            CleaningFeeMur: booking.CleaningFeeMur,
            SubtotalMur: booking.SubtotalMur,
            VatMur: booking.VatMur,
            TotalMur: booking.TotalMur,
            HoldExpiresAt: booking.HoldExpiresAt);
    }
}
