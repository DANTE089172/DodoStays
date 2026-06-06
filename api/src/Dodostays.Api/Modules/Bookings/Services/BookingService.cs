using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Contracts.Bookings;
using Dodostays.Api.Contracts.Payments;
using Dodostays.Api.Modules.Bookings.Domain;
using Dodostays.Api.Modules.Common.Database;
using Dodostays.Api.Modules.Payments.Domain;
using Dodostays.Api.Modules.Payments.Idempotency;
using Dodostays.Api.Modules.Payments.Processing;
using Dodostays.Api.Modules.Payments.Invoices;
using Dodostays.Api.Modules.Payments.Email;
using Microsoft.Extensions.Logging;

namespace Dodostays.Api.Modules.Bookings.Services;

public sealed class BookingService
{
    private readonly DodostaysDbContext _db;
    private readonly IPaymentProcessor _paymentProcessor;
    private readonly IIdempotencyService _idempotencyService;
    private readonly IInvoiceGenerator _invoiceGenerator;
    private readonly IInvoicePdfStorage _invoicePdfStorage;
    private readonly IEmailSender _emailSender;
    private readonly ILogger<BookingService> _logger;

    public BookingService(
        DodostaysDbContext db,
        IPaymentProcessor paymentProcessor,
        IIdempotencyService idempotencyService,
        IInvoiceGenerator invoiceGenerator,
        IInvoicePdfStorage invoicePdfStorage,
        IEmailSender emailSender,
        ILogger<BookingService> logger)
    {
        _db = db;
        _paymentProcessor = paymentProcessor;
        _idempotencyService = idempotencyService;
        _invoiceGenerator = invoiceGenerator;
        _invoicePdfStorage = invoicePdfStorage;
        _emailSender = emailSender;
        _logger = logger;
    }

    public async Task<BookingDto> ConfirmAsync(Guid guestUserId, Guid bookingId, string? paymentReference, string? idempotencyKey, CancellationToken ct)
    {
        // Wrap entire flow in idempotency service
        var result = await _idempotencyService.GetOrExecuteAsync<BookingDto>(
            headerKey: idempotencyKey,
            scope: "booking-confirm",
            bookingId: bookingId,
            factory: async (ct) =>
            {
                // Load booking
                var booking = await _db.Bookings
                    .SingleOrDefaultAsync(b => b.Id == bookingId, ct)
                    ?? throw new KeyNotFoundException("Booking not found.");

                if (booking.GuestUserId != guestUserId)
                    throw new UnauthorizedAccessException("Not your booking.");

                // Verify state is PendingPayment (which maps to Hold in the task description)
                if (booking.State != BookingState.PendingPayment)
                    throw new InvalidOperationException($"Cannot confirm booking in state {booking.State}.");

                if (booking.HoldExpiresAt < DateTimeOffset.UtcNow)
                    throw new InvalidOperationException("Hold expired — please hold dates again.");

                // Load listing for invoice
                var listing = await _db.Listings
                    .Where(l => l.Id == booking.ListingId)
                    .Select(l => new { l.Title })
                    .SingleAsync(ct);

                // Compute totals from existing booking fields
                var netTotal = booking.SubtotalMur;
                var vat = booking.VatMur;
                var gross = booking.TotalMur;

                // Capture payment
                var receipt = await _paymentProcessor.AuthorizeAndCaptureAsync(
                    bookingId,
                    gross,
                    idempotencyKey ?? Guid.NewGuid().ToString("N"),
                    ct);

                if (receipt.Status != PaymentStatus.Captured)
                    throw new InvalidOperationException($"Payment failed: {receipt.Status}");

                // Create PaymentRecord
                var paymentRecord = new PaymentRecord
                {
                    Id = Guid.NewGuid(),
                    BookingId = booking.Id,
                    ProcessorId = receipt.ProcessorId,
                    ExternalRef = receipt.ExternalRef,
                    AmountMur = gross,
                    Status = PaymentStatus.Captured,
                    AttemptedAt = DateTimeOffset.UtcNow,
                    SucceededAt = receipt.SucceededAt,
                    FailureReason = null,
                    RawPayloadJson = null
                };
                _db.PaymentRecords.Add(paymentRecord);

                // Load guest user for invoice
                var guestUser = await _db.Users
                    .Where(u => u.Id == booking.GuestUserId)
                    .Select(u => new { u.DisplayName, u.Email })
                    .SingleAsync(ct);

                // Compute nights
                var nights = (booking.CheckOut.DayNumber - booking.CheckIn.DayNumber);

                // Generate guest invoice
                var invoice = await _invoiceGenerator.GenerateGuestStayAsync(new GuestInvoiceInput(
                    BookingId: booking.Id,
                    GuestDisplayName: guestUser.DisplayName,
                    GuestVatNumber: null,  // not collected at v1
                    ListingTitle: listing.Title,
                    CheckIn: booking.CheckIn,
                    CheckOut: booking.CheckOut,
                    Nights: nights,
                    NightlyRateNetMur: booking.NightlyRateMur,
                    CleaningFeeNetMur: booking.CleaningFeeMur,
                    DamageDepositMur: 0m), ct);  // TODO: Listing.DamageDepositMur field is Plan 04 v2 follow-up
                _db.Invoices.Add(invoice);

                // Update booking state
                booking.MarkConfirmed(receipt.ExternalRef);

                // Remove holds
                var holds = await _db.BookingHolds.Where(h => h.BookingId == bookingId).ToListAsync(ct);
                _db.BookingHolds.RemoveRange(holds);

                // Commit transaction
                await _db.SaveChangesAsync(ct);

                // Send confirmation email (fire-and-forget, don't fail confirm if email fails)
                try
                {
                    var pdfBytes = await _invoicePdfStorage.ReadAsync(invoice.PdfStoragePath, ct);
                    var emailMessage = new EmailMessage(
                        To: guestUser.Email ?? throw new InvalidOperationException("Guest user has no email."),
                        Subject: $"Your DodoStays booking is confirmed - {listing.Title}",
                        Body: $@"
<h1>Your DodoStays booking is confirmed</h1>
<p>Hi {guestUser.DisplayName}, your stay at <strong>{listing.Title}</strong> from {booking.CheckIn:yyyy-MM-dd} to {booking.CheckOut:yyyy-MM-dd} is confirmed.</p>
<p><strong>Total:</strong> MUR {gross:N2}</p>
<p><strong>Invoice number:</strong> {invoice.Number}</p>
<p>We look forward to hosting you!</p>
",
                        IsHtml: true,
                        Attachments: pdfBytes != null
                            ? new[] { new EmailAttachment($"{invoice.Number}.pdf", "application/pdf", pdfBytes) }
                            : null);

                    await _emailSender.SendAsync(emailMessage, ct);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send confirmation email for booking {BookingId}", bookingId);
                    // Don't fail the entire confirm
                }

                return (await ToDtoAsync(booking, ct), 200);
            },
            ttl: null,
            ct: ct);

        return result.Body;
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
