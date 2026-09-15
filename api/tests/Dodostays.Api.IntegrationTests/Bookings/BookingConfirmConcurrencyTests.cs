using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Dodostays.Api.Contracts.Bookings;
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Contracts.Listings;
using Dodostays.Api.Contracts.Payments;
using Dodostays.Api.IntegrationTests.Listings;
using Dodostays.Api.Modules.Bookings.Domain;
using Dodostays.Api.Modules.Common.Database;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Dodostays.Api.IntegrationTests.Bookings;

/// <summary>
/// Covers the double-booking hardening: confirmation re-validates the calendar under the listing
/// lock (an external iCal block that lands during the hold window must block the confirm and take
/// no money), and availability no longer treats an abandoned PendingPayment booking as a permanent
/// block.
/// </summary>
public class BookingConfirmConcurrencyTests : IClassFixture<PostgresFixture>
{
    private readonly PostgresFixture _fx;
    public BookingConfirmConcurrencyTests(PostgresFixture fx) => _fx = fx;

    [Fact]
    public async Task Confirm_WhenExternalBlockAppearsDuringHold_Returns409_TakesNoPayment_CancelsBooking()
    {
        using var factory = _fx.CreateFactory();
        var guest = await CreateAuthenticatedGuestAsync(factory);
        var (host, _) = await ListingTestHelpers.CreateAuthenticatedHostAsync(factory);

        var createListing = await host.PostAsJsonAsync("/api/listings", ListingTestHelpers.SampleListing());
        var listing = (await createListing.Content.ReadFromJsonAsync<ListingDto>())!;
        await host.PostAsync($"/api/listings/{listing.Id}/publish", null);

        var checkIn = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(40);
        var checkOut = checkIn.AddDays(5);

        // Guest holds the dates (free at this point).
        var holdResponse = await guest.PostAsJsonAsync("/api/bookings/hold",
            new HoldBookingRequest(listing.Id, checkIn, checkOut, NumGuests: 2));
        holdResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var holdDto = (await holdResponse.Content.ReadFromJsonAsync<HoldBookingResponse>())!;

        // During the 15-minute window, an iCal sync pulls in an overlapping Airbnb booking.
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<DodostaysDbContext>();
            db.ExternalCalendarBlocks.Add(new ExternalCalendarBlock
            {
                ListingId = listing.Id,
                FeedId = Guid.NewGuid(),
                ExternalUid = $"airbnb-{Guid.NewGuid():N}",
                CheckIn = checkIn,
                CheckOut = checkOut,
                Summary = "Airbnb reservation"
            });
            await db.SaveChangesAsync();
        }

        // Confirm must be rejected — the calendar changed.
        var confirm = await guest.PostAsJsonAsync("/api/bookings/confirm", new ConfirmBookingRequest(holdDto.BookingId));
        confirm.StatusCode.Should().Be(HttpStatusCode.Conflict);

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<DodostaysDbContext>();

            var booking = await db.Bookings.SingleAsync(b => b.Id == holdDto.BookingId);
            booking.State.Should().Be(BookingState.Cancelled, "the conflicting booking must be released");

            (await db.PaymentRecords.CountAsync(p => p.BookingId == holdDto.BookingId))
                .Should().Be(0, "no payment may be captured when the dates are gone");
            (await db.Invoices.CountAsync(i => i.BookingId == holdDto.BookingId))
                .Should().Be(0, "no invoice may be issued for a rejected confirmation");
        }
    }

    [Fact]
    public async Task Availability_IgnoresAbandonedPendingBookingWithExpiredHold()
    {
        using var factory = _fx.CreateFactory();
        var (host, hostAuth) = await ListingTestHelpers.CreateAuthenticatedHostAsync(factory);

        var createListing = await host.PostAsJsonAsync("/api/listings", ListingTestHelpers.SampleListing());
        var listing = (await createListing.Content.ReadFromJsonAsync<ListingDto>())!;

        var checkIn = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(60);
        var checkOut = checkIn.AddDays(4);

        // An abandoned checkout: a PendingPayment booking whose hold expired an hour ago.
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<DodostaysDbContext>();
            var bookingId = Guid.NewGuid();
            db.Bookings.Add(new Booking
            {
                Id = bookingId,
                ListingId = listing.Id,
                GuestUserId = Guid.NewGuid(),
                HostUserId = hostAuth.User.Id,
                State = BookingState.PendingPayment,
                CheckIn = checkIn,
                CheckOut = checkOut,
                NumGuests = 2,
                NightlyRateMur = 5000m,
                CleaningFeeMur = 800m,
                SubtotalMur = 20000m,
                VatMur = 3000m,
                TotalMur = 23000m,
                HoldExpiresAt = DateTimeOffset.UtcNow.AddHours(-1)
            });
            db.BookingHolds.Add(new BookingHold
            {
                BookingId = bookingId,
                ListingId = listing.Id,
                CheckIn = checkIn,
                CheckOut = checkOut,
                ExpiresAt = DateTimeOffset.UtcNow.AddHours(-1)
            });
            await db.SaveChangesAsync();
        }

        var avail = await host.GetAsync($"/api/listings/{listing.Id}/availability?from={checkIn:yyyy-MM-dd}&to={checkOut:yyyy-MM-dd}");
        avail.StatusCode.Should().Be(HttpStatusCode.OK);
        var resp = (await avail.Content.ReadFromJsonAsync<AvailabilityResponse>())!;
        resp.IsAvailable.Should().BeTrue("an expired hold on an unconfirmed booking must not block the dates");
    }

    [Fact]
    public async Task Availability_IsBlockedByConfirmedBooking()
    {
        using var factory = _fx.CreateFactory();
        var (host, hostAuth) = await ListingTestHelpers.CreateAuthenticatedHostAsync(factory);

        var createListing = await host.PostAsJsonAsync("/api/listings", ListingTestHelpers.SampleListing());
        var listing = (await createListing.Content.ReadFromJsonAsync<ListingDto>())!;

        var checkIn = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(80);
        var checkOut = checkIn.AddDays(4);

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<DodostaysDbContext>();
            db.Bookings.Add(new Booking
            {
                Id = Guid.NewGuid(),
                ListingId = listing.Id,
                GuestUserId = Guid.NewGuid(),
                HostUserId = hostAuth.User.Id,
                State = BookingState.Confirmed,
                CheckIn = checkIn,
                CheckOut = checkOut,
                NumGuests = 2,
                NightlyRateMur = 5000m,
                CleaningFeeMur = 800m,
                SubtotalMur = 20000m,
                VatMur = 3000m,
                TotalMur = 23000m,
                HoldExpiresAt = DateTimeOffset.UtcNow.AddHours(-1),
                ConfirmedAt = DateTimeOffset.UtcNow
            });
            await db.SaveChangesAsync();
        }

        var avail = await host.GetAsync($"/api/listings/{listing.Id}/availability?from={checkIn:yyyy-MM-dd}&to={checkOut:yyyy-MM-dd}");
        avail.StatusCode.Should().Be(HttpStatusCode.OK);
        var resp = (await avail.Content.ReadFromJsonAsync<AvailabilityResponse>())!;
        resp.IsAvailable.Should().BeFalse("a confirmed booking must still block the dates");
    }

    private static async Task<HttpClient> CreateAuthenticatedGuestAsync(WebApplicationFactory<Program> factory)
    {
        var client = factory.CreateClient();
        var email = $"guest-{Guid.NewGuid():N}@test.local";
        var signup = await client.PostAsJsonAsync("/api/identity/signup",
            new SignUpRequest(email, "Aa1!aaaaaa", "Test Guest", "en", UserRole.Guest));
        signup.EnsureSuccessStatusCode();
        var auth = (await signup.Content.ReadFromJsonAsync<AuthResponse>())!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);
        return client;
    }
}
