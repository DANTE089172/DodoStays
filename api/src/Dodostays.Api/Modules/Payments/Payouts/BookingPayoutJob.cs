using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Dodostays.Api.Contracts.Bookings;
using Dodostays.Api.Contracts.Payments;
using Dodostays.Api.Modules.Common.Database;
using Dodostays.Api.Modules.Payments.Domain;
using Dodostays.Api.Modules.Payments.Email;
using Dodostays.Api.Modules.Payments.Invoices;

namespace Dodostays.Api.Modules.Payments.Payouts;

public sealed class BookingPayoutJob
{
    private readonly DodostaysDbContext _db;
    private readonly IPayoutProcessor _payoutProcessor;
    private readonly IInvoiceGenerator _invoiceGenerator;
    private readonly IEmailSender _emailSender;
    private readonly PayoutOptions _options;
    private readonly ILogger<BookingPayoutJob> _logger;

    public BookingPayoutJob(
        DodostaysDbContext db,
        IPayoutProcessor payoutProcessor,
        IInvoiceGenerator invoiceGenerator,
        IEmailSender emailSender,
        IOptions<PayoutOptions> options,
        ILogger<BookingPayoutJob> logger)
    {
        _db = db;
        _payoutProcessor = payoutProcessor;
        _invoiceGenerator = invoiceGenerator;
        _emailSender = emailSender;
        _options = options.Value;
        _logger = logger;
    }

    public async Task RunAsync(CancellationToken ct = default)
    {
        // 1. Biweekly gate
        if (_options.BiweeklyEvenWeeks)
        {
            var weekOfYear = System.Globalization.ISOWeek.GetWeekOfYear(DateTime.UtcNow);
            if (weekOfYear % 2 != 0)
            {
                _logger.LogInformation("Skipping payout run — odd ISO week {Week}", weekOfYear);
                return;
            }
        }

        // 2. Find eligible bookings
        // Eligible: PayoutStatus=NotEligible, State=CheckedIn or Completed, CheckedInAt >= 24h ago
        var cutoff = DateTimeOffset.UtcNow.AddHours(-24);
        var eligibleBookings = await _db.Bookings
            .Where(b =>
                b.PayoutStatus == PayoutStatus.NotEligible &&
                (b.State == BookingState.CheckedIn || b.State == BookingState.Completed) &&
                b.CheckedInAt != null && b.CheckedInAt <= cutoff)
            .ToListAsync(ct);

        if (eligibleBookings.Count == 0)
        {
            _logger.LogInformation("No eligible bookings found for payout.");
            return;
        }

        _logger.LogInformation("Found {Count} eligible bookings for payout", eligibleBookings.Count);

        // 3. Group by host
        var groups = eligibleBookings.GroupBy(b => b.HostUserId);

        int successCount = 0;
        int failedCount = 0;

        foreach (var group in groups)
        {
            var hostUserId = group.Key;
            try
            {
                await ProcessHostPayoutAsync(hostUserId, group.ToList(), ct);
                successCount++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to process payout for host {HostUserId}", hostUserId);
                failedCount++;
            }
        }

        _logger.LogInformation("Payout job complete: {SuccessCount} hosts paid, {FailedCount} failed",
            successCount, failedCount);
    }

    private async Task ProcessHostPayoutAsync(
        Guid hostUserId,
        List<Dodostays.Api.Modules.Bookings.Domain.Booking> bookings,
        CancellationToken ct)
    {
        var bookingIds = bookings.Select(b => b.Id).ToList();

        // Calculate totals
        // Commission is 5% of TotalMur (gross booking amount, which includes VAT).
        // The commission itself is VAT-inclusive: commission = gross * 5% / 100.
        // To split commission into net and VAT: commission_net = commission / 1.15, commission_vat = commission - commission_net.
        var totalGrossMur = bookings.Sum(b => b.TotalMur);
        var commissionPercent = _options.CommissionPercent;
        var commissionMur = Math.Round(totalGrossMur * commissionPercent / 100m, 2, MidpointRounding.AwayFromZero);
        var netMur = totalGrossMur - commissionMur;

        // Create HostPayout entity
        var payoutId = Guid.NewGuid();
        var payout = new HostPayout
        {
            Id = payoutId,
            HostUserId = hostUserId,
            BookingIds = bookingIds,
            TotalGrossMur = totalGrossMur,
            CommissionMur = commissionMur,
            NetMur = netMur,
            Status = PayoutStatus.Pending,
            ProcessorId = _payoutProcessor.ProcessorId,
            ExternalRef = null,
            AttemptedAt = DateTimeOffset.UtcNow,
            SucceededAt = null,
            FailureReason = null
        };
        _db.HostPayouts.Add(payout);

        // Deterministic idempotency key per (host, date)
        var idempotencyKey = $"payout:{hostUserId:N}:{DateTimeOffset.UtcNow:yyyy-MM-dd}";

        // Call payout processor
        PayoutReceipt receipt;
        try
        {
            receipt = await _payoutProcessor.SendAsync(hostUserId, netMur, idempotencyKey, ct);
        }
        catch (Exception ex)
        {
            payout.Status = PayoutStatus.Failed;
            payout.FailureReason = ex.Message.Length > 1000 ? ex.Message[..1000] : ex.Message;
            await _db.SaveChangesAsync(ct);
            _logger.LogError(ex, "Payout processor failed for host {HostUserId}", hostUserId);
            throw;
        }

        if (receipt.Status != PayoutStatus.Paid)
        {
            payout.Status = PayoutStatus.Failed;
            payout.FailureReason = $"Processor returned status {receipt.Status}";
            await _db.SaveChangesAsync(ct);
            _logger.LogWarning("Payout failed for host {HostUserId}: {Reason}", hostUserId, payout.FailureReason);
            return;
        }

        // Payout succeeded
        payout.Status = PayoutStatus.Paid;
        payout.ExternalRef = receipt.ExternalRef;
        payout.SucceededAt = receipt.SucceededAt;

        // Generate commission invoice (the platform invoices the host for the commission)
        // Commission is VAT-inclusive, so split it: net = commission / 1.15
        var commissionNetMur = Math.Round(commissionMur / 1.15m, 2, MidpointRounding.AwayFromZero);

        // Load host info
        var host = await _db.Users.FirstOrDefaultAsync(u => u.Id == hostUserId, ct);
        var hostDisplayName = host?.DisplayName ?? "Unknown Host";

        // For batch payouts, we use a representative listing title
        var firstBooking = bookings.First();
        var listing = await _db.Listings.FirstOrDefaultAsync(l => l.Id == firstBooking.ListingId, ct);
        var listingTitle = listing?.Title ?? "Batch Payout";

        var commissionInvoice = await _invoiceGenerator.GenerateHostCommissionAsync(
            new HostCommissionInvoiceInput(
                BookingId: firstBooking.Id,
                PayoutId: payoutId,
                HostDisplayName: hostDisplayName,
                HostVatNumber: null,
                ListingTitle: $"{bookings.Count} bookings — {listingTitle}",
                CommissionNetMur: commissionNetMur),
            ct);

        _db.Invoices.Add(commissionInvoice);

        // Mark all bookings as paid out
        foreach (var booking in bookings)
        {
            booking.PayoutStatus = PayoutStatus.Paid;
        }

        await _db.SaveChangesAsync(ct);

        // Send host receipt email (fire-and-forget with try/catch)
        try
        {
            if (host?.Email != null)
            {
                await _emailSender.SendAsync(new EmailMessage(
                    To: host.Email,
                    Subject: $"Your DodoStays payout — MUR {netMur:N2}",
                    Body: $"<h1>Payout sent</h1><p>Net MUR {netMur:N2} for {bookingIds.Count} bookings.</p><p>Commission invoice: {commissionInvoice.Number}</p>",
                    IsHtml: true), ct);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send payout receipt email to host {HostId}", hostUserId);
        }

        _logger.LogInformation("Payout processed successfully for host {HostUserId}: {PayoutId}, {Count} bookings, MUR {Amount}",
            hostUserId, payoutId, bookings.Count, netMur);
    }
}
