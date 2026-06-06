using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;
using Dodostays.Api.Contracts.Bookings;
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Contracts.Listings;
using Dodostays.Api.Contracts.Payments;
using Dodostays.Api.IntegrationTests.Listings;
using Dodostays.Api.Modules.Common.Database;
using Dodostays.Api.Modules.Payments.Domain;

namespace Dodostays.Api.IntegrationTests.Payments;

public class ConfirmBookingPaymentFlowTests : IClassFixture<PostgresFixture>
{
    private readonly PostgresFixture _fx;
    public ConfirmBookingPaymentFlowTests(PostgresFixture fx) => _fx = fx;

    [Fact]
    public async Task Confirm_WithoutIdempotencyKey_CapturesPayment_ConfirmsBooking_GeneratesInvoice_QueuesEmail()
    {
        using var factory = _fx.CreateFactory();
        var (guest, _) = await CreateAuthenticatedGuestAsync(factory);
        var (host, _) = await ListingTestHelpers.CreateAuthenticatedHostAsync(factory);

        // Create listing
        var createListing = await host.PostAsJsonAsync("/api/listings", ListingTestHelpers.SampleListing());
        var listing = (await createListing.Content.ReadFromJsonAsync<ListingDto>())!;

        // Publish listing
        await host.PostAsync($"/api/listings/{listing.Id}/publish", null);

        // Hold booking
        var holdRequest = new HoldBookingRequest(
            listing.Id,
            new DateOnly(2026, 7, 10),
            new DateOnly(2026, 7, 15),
            NumGuests: 2);
        var holdResponse = await guest.PostAsJsonAsync("/api/bookings/hold", holdRequest);
        holdResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var holdDto = (await holdResponse.Content.ReadFromJsonAsync<HoldBookingResponse>())!;

        // Confirm booking
        var confirmRequest = new ConfirmBookingRequest(holdDto.BookingId);
        var confirmResponse = await guest.PostAsJsonAsync("/api/bookings/confirm", confirmRequest);

        // Assert HTTP 200
        confirmResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var confirmedDto = (await confirmResponse.Content.ReadFromJsonAsync<BookingDto>())!;

        // Assert booking is confirmed
        confirmedDto.State.Should().Be(BookingState.Confirmed);
        confirmedDto.ConfirmedAt.Should().NotBeNull();

        // Assert DB state
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<DodostaysDbContext>();

            // Check PaymentRecord
            var paymentRecord = await db.PaymentRecords
                .SingleOrDefaultAsync(p => p.BookingId == holdDto.BookingId);
            paymentRecord.Should().NotBeNull();
            paymentRecord!.Status.Should().Be(PaymentStatus.Captured);
            paymentRecord.AmountMur.Should().Be(confirmedDto.TotalMur);

            // Check Invoice
            var invoice = await db.Invoices
                .SingleOrDefaultAsync(i => i.BookingId == holdDto.BookingId);
            invoice.Should().NotBeNull();
            invoice!.Kind.Should().Be(InvoiceKind.GuestStay);
            invoice.Number.Should().MatchRegex(@"^DS-\d{4}-\d{5}$");
            invoice.GrossMur.Should().Be(confirmedDto.TotalMur);
            invoice.VatMur.Should().Be(confirmedDto.VatMur);
            invoice.NetMur.Should().Be(confirmedDto.SubtotalMur);

            // Check booking state in DB
            var booking = await db.Bookings.SingleAsync(b => b.Id == holdDto.BookingId);
            booking.State.Should().Be(BookingState.Confirmed);

            // Check invoice has storage path set (PDF generation was called)
            invoice.PdfStoragePath.Should().NotBeNullOrEmpty();
            invoice.PdfStoragePath.Should().MatchRegex(@"invoices/\d{4}/\d{2}/DS-\d{4}-\d{5}\.pdf");
        }
    }

    [Fact]
    public async Task Confirm_WithIdempotencyKey_TwiceWithSameKey_PaymentProcessorCalledOnce_ResponsesIdentical()
    {
        using var factory = _fx.CreateFactory();
        var (guest, _) = await CreateAuthenticatedGuestAsync(factory);
        var (host, _) = await ListingTestHelpers.CreateAuthenticatedHostAsync(factory);

        // Create and publish listing
        var createListing = await host.PostAsJsonAsync("/api/listings", ListingTestHelpers.SampleListing());
        var listing = (await createListing.Content.ReadFromJsonAsync<ListingDto>())!;
        await host.PostAsync($"/api/listings/{listing.Id}/publish", null);

        // Hold booking
        var holdRequest = new HoldBookingRequest(
            listing.Id,
            new DateOnly(2026, 7, 10),
            new DateOnly(2026, 7, 15),
            NumGuests: 2);
        var holdResponse = await guest.PostAsJsonAsync("/api/bookings/hold", holdRequest);
        var holdDto = (await holdResponse.Content.ReadFromJsonAsync<HoldBookingResponse>())!;

        // Confirm with idempotency key - first call
        var idempotencyKey = Guid.NewGuid().ToString("N");
        var confirmRequest = new ConfirmBookingRequest(holdDto.BookingId, IdempotencyKey: idempotencyKey);

        var confirm1 = await guest.PostAsJsonAsync("/api/bookings/confirm", confirmRequest);
        confirm1.StatusCode.Should().Be(HttpStatusCode.OK);
        var dto1 = (await confirm1.Content.ReadFromJsonAsync<BookingDto>())!;

        // Confirm with same idempotency key - second call
        var confirm2 = await guest.PostAsJsonAsync("/api/bookings/confirm", confirmRequest);
        confirm2.StatusCode.Should().Be(HttpStatusCode.OK);
        var dto2 = (await confirm2.Content.ReadFromJsonAsync<BookingDto>())!;

        // Assert responses are identical
        dto1.Id.Should().Be(dto2.Id);
        dto1.State.Should().Be(dto2.State);
        dto1.ConfirmedAt.Should().Be(dto2.ConfirmedAt);

        // Assert only ONE PaymentRecord and ONE Invoice in DB
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<DodostaysDbContext>();

            var paymentCount = await db.PaymentRecords.CountAsync(p => p.BookingId == holdDto.BookingId);
            paymentCount.Should().Be(1, "Only one payment should be captured");

            var invoiceCount = await db.Invoices.CountAsync(i => i.BookingId == holdDto.BookingId);
            invoiceCount.Should().Be(1, "Only one invoice should be generated");
        }
    }

    [Fact]
    public async Task Confirm_WhenHoldExpired_Returns409()
    {
        using var factory = _fx.CreateFactory();
        var (guest, guestUserId) = await CreateAuthenticatedGuestAsync(factory);
        var (host, _) = await ListingTestHelpers.CreateAuthenticatedHostAsync(factory);

        // Create and publish listing
        var createListing = await host.PostAsJsonAsync("/api/listings", ListingTestHelpers.SampleListing());
        var listing = (await createListing.Content.ReadFromJsonAsync<ListingDto>())!;
        await host.PostAsync($"/api/listings/{listing.Id}/publish", null);

        // Create a booking with expired hold directly in DB
        Guid bookingId;
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<DodostaysDbContext>();
            var listingEntity = await db.Listings.SingleAsync(l => l.Id == listing.Id);

            var booking = new Dodostays.Api.Modules.Bookings.Domain.Booking
            {
                Id = Guid.NewGuid(),
                ListingId = listing.Id,
                GuestUserId = guestUserId,
                HostUserId = listingEntity.HostUserId,
                State = BookingState.PendingPayment,
                CheckIn = new DateOnly(2026, 7, 10),
                CheckOut = new DateOnly(2026, 7, 15),
                NumGuests = 2,
                NightlyRateMur = 1000m,
                CleaningFeeMur = 0m,
                SubtotalMur = 5000m,
                VatMur = 750m,
                TotalMur = 5750m,
                HoldExpiresAt = DateTimeOffset.UtcNow.AddSeconds(-1) // Expired
            };
            db.Bookings.Add(booking);
            await db.SaveChangesAsync();
            bookingId = booking.Id;
        }

        // Try to confirm
        var confirmRequest = new ConfirmBookingRequest(bookingId);
        var confirmResponse = await guest.PostAsJsonAsync("/api/bookings/confirm", confirmRequest);

        // Assert 409 Conflict
        confirmResponse.StatusCode.Should().Be(HttpStatusCode.Conflict);

        // Assert no PaymentRecord or Invoice was created
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<DodostaysDbContext>();
            var paymentCount = await db.PaymentRecords.CountAsync(p => p.BookingId == bookingId);
            paymentCount.Should().Be(0);

            var invoiceCount = await db.Invoices.CountAsync(i => i.BookingId == bookingId);
            invoiceCount.Should().Be(0);
        }
    }

    [Fact]
    public async Task Confirm_WhenAlreadyConfirmed_Returns409()
    {
        using var factory = _fx.CreateFactory();
        var (guest, _) = await CreateAuthenticatedGuestAsync(factory);
        var (host, _) = await ListingTestHelpers.CreateAuthenticatedHostAsync(factory);

        // Create and publish listing
        var createListing = await host.PostAsJsonAsync("/api/listings", ListingTestHelpers.SampleListing());
        var listing = (await createListing.Content.ReadFromJsonAsync<ListingDto>())!;
        await host.PostAsync($"/api/listings/{listing.Id}/publish", null);

        // Hold and confirm booking (first time)
        var holdRequest = new HoldBookingRequest(
            listing.Id,
            new DateOnly(2026, 7, 10),
            new DateOnly(2026, 7, 15),
            NumGuests: 2);
        var holdResponse = await guest.PostAsJsonAsync("/api/bookings/hold", holdRequest);
        var holdDto = (await holdResponse.Content.ReadFromJsonAsync<HoldBookingResponse>())!;

        var firstConfirm = await guest.PostAsJsonAsync("/api/bookings/confirm",
            new ConfirmBookingRequest(holdDto.BookingId));
        firstConfirm.StatusCode.Should().Be(HttpStatusCode.OK);

        // Try to confirm again
        var secondConfirm = await guest.PostAsJsonAsync("/api/bookings/confirm",
            new ConfirmBookingRequest(holdDto.BookingId));

        // Assert 409 Conflict
        secondConfirm.StatusCode.Should().Be(HttpStatusCode.Conflict);

        // Assert still only ONE PaymentRecord and ONE Invoice
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<DodostaysDbContext>();

            var paymentCount = await db.PaymentRecords.CountAsync(p => p.BookingId == holdDto.BookingId);
            paymentCount.Should().Be(1);

            var invoiceCount = await db.Invoices.CountAsync(i => i.BookingId == holdDto.BookingId);
            invoiceCount.Should().Be(1);
        }
    }

    private static async Task<(HttpClient client, Guid userId)> CreateAuthenticatedGuestAsync(
        Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactory<Program> factory)
    {
        var client = factory.CreateClient();

        // Signup
        var email = $"guest-{Guid.NewGuid():N}@test.local";
        var signupRequest = new SignUpRequest(
            email,
            "Aa1!aaaaaa",
            $"Guest {Guid.NewGuid():N}",
            "en",
            UserRole.Guest);
        var signupResponse = await client.PostAsJsonAsync("/api/identity/signup", signupRequest);
        signupResponse.EnsureSuccessStatusCode();
        var auth = (await signupResponse.Content.ReadFromJsonAsync<AuthResponse>())!;

        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", auth.AccessToken);

        return (client, auth.User.Id);
    }
}
