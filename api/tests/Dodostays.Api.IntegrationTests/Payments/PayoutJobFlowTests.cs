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
using Dodostays.Api.Modules.Payments.Payouts;

namespace Dodostays.Api.IntegrationTests.Payments;

public class PayoutJobFlowTests : IClassFixture<PostgresFixture>
{
    private readonly PostgresFixture _fx;
    public PayoutJobFlowTests(PostgresFixture fx) => _fx = fx;

    [Fact]
    public async Task RunAsync_EligibleBookings_CreatesHostPayout_GeneratesCommissionInvoice_MarksBookingsPaid()
    {
        using var factory = _fx.CreateFactory();

        // Create host, listing, and bookings
        Guid hostUserId;
        Guid listingId;
        Guid booking1Id;
        Guid booking2Id;

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<DodostaysDbContext>();

            // Create host user
            var host = new Dodostays.Api.Modules.Identity.Domain.DodostaysUser
            {
                Id = Guid.NewGuid(),
                DisplayName = "Test Host",
                Email = "host@test.local",
                UserName = "host@test.local",
                NormalizedUserName = "HOST@TEST.LOCAL",
                NormalizedEmail = "HOST@TEST.LOCAL",
                Role = UserRole.Host
            };
            db.Users.Add(host);
            await db.SaveChangesAsync();
            hostUserId = host.Id;

            // Create guest user
            var guest = new Dodostays.Api.Modules.Identity.Domain.DodostaysUser
            {
                Id = Guid.NewGuid(),
                DisplayName = "Test Guest",
                Email = "guest@test.local",
                UserName = "guest@test.local",
                NormalizedUserName = "GUEST@TEST.LOCAL",
                NormalizedEmail = "GUEST@TEST.LOCAL",
                Role = UserRole.Guest
            };
            db.Users.Add(guest);
            await db.SaveChangesAsync();

            // Create listing
            var listing = new Dodostays.Api.Modules.Listings.Domain.Listing
            {
                Id = Guid.NewGuid(),
                HostUserId = hostUserId,
                Title = "Test Villa",
                Description = "Test",
                PropertyType = PropertyType.Villa,
                Status = ListingStatus.Published,
                Region = "Grand Baie",
                AddressLine = "123 Test St",
                Latitude = -20.0,
                Longitude = 57.5,
                Location = new NetTopologySuite.Geometries.Point(57.5, -20.0) { SRID = 4326 },
                Bedrooms = 2,
                Beds = 2,
                Bathrooms = 1,
                MaxGuests = 4,
                NightlyRateMur = 1000m,
                CleaningFeeMur = 0m,
                MinStayNights = 1
            };
            db.Listings.Add(listing);
            await db.SaveChangesAsync();
            listingId = listing.Id;

            // Create 2 bookings, both checked in 2 days ago (eligible for payout)
            var booking1 = new Dodostays.Api.Modules.Bookings.Domain.Booking
            {
                Id = Guid.NewGuid(),
                ListingId = listingId,
                GuestUserId = guest.Id,
                HostUserId = hostUserId,
                State = BookingState.CheckedIn,
                PayoutStatus = PayoutStatus.NotEligible,
                CheckIn = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-10)),
                CheckOut = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-5)),
                NumGuests = 2,
                NightlyRateMur = 1000m,
                CleaningFeeMur = 0m,
                SubtotalMur = 5000m,
                VatMur = 750m,
                TotalMur = 5750m,
                CheckedInAt = DateTimeOffset.UtcNow.AddDays(-2),
                ConfirmedAt = DateTimeOffset.UtcNow.AddDays(-12)
            };
            db.Bookings.Add(booking1);

            var booking2 = new Dodostays.Api.Modules.Bookings.Domain.Booking
            {
                Id = Guid.NewGuid(),
                ListingId = listingId,
                GuestUserId = guest.Id,
                HostUserId = hostUserId,
                State = BookingState.Completed,
                PayoutStatus = PayoutStatus.NotEligible,
                CheckIn = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-20)),
                CheckOut = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-15)),
                NumGuests = 2,
                NightlyRateMur = 1000m,
                CleaningFeeMur = 0m,
                SubtotalMur = 5000m,
                VatMur = 750m,
                TotalMur = 5750m,
                CheckedInAt = DateTimeOffset.UtcNow.AddDays(-20),
                ConfirmedAt = DateTimeOffset.UtcNow.AddDays(-22),
                CompletedAt = DateTimeOffset.UtcNow.AddDays(-15)
            };
            db.Bookings.Add(booking2);

            await db.SaveChangesAsync();
            booking1Id = booking1.Id;
            booking2Id = booking2.Id;

            // Create PaymentRecords for each booking
            var payment1 = new Dodostays.Api.Modules.Payments.Domain.PaymentRecord
            {
                Id = Guid.NewGuid(),
                BookingId = booking1Id,
                ProcessorId = "InMemory",
                ExternalRef = "INMEM-TEST1",
                AmountMur = 5750m,
                Status = PaymentStatus.Captured,
                SucceededAt = DateTimeOffset.UtcNow.AddDays(-12)
            };
            db.PaymentRecords.Add(payment1);

            var payment2 = new Dodostays.Api.Modules.Payments.Domain.PaymentRecord
            {
                Id = Guid.NewGuid(),
                BookingId = booking2Id,
                ProcessorId = "InMemory",
                ExternalRef = "INMEM-TEST2",
                AmountMur = 5750m,
                Status = PaymentStatus.Captured,
                SucceededAt = DateTimeOffset.UtcNow.AddDays(-22)
            };
            db.PaymentRecords.Add(payment2);

            await db.SaveChangesAsync();
        }

        // Run the payout job
        using (var scope = factory.Services.CreateScope())
        {
            var job = scope.ServiceProvider.GetRequiredService<BookingPayoutJob>();
            await job.RunAsync(CancellationToken.None);
        }

        // Assert results
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<DodostaysDbContext>();

            // Check HostPayout
            var payout = await db.HostPayouts.SingleOrDefaultAsync(p => p.HostUserId == hostUserId);
            payout.Should().NotBeNull();
            payout!.Status.Should().Be(PayoutStatus.Paid);
            payout.BookingIds.Should().HaveCount(2);
            payout.BookingIds.Should().Contain(new[] { booking1Id, booking2Id });
            payout.TotalGrossMur.Should().Be(11500m); // 5750 * 2
            payout.CommissionMur.Should().Be(575m); // 5% of 11500
            payout.NetMur.Should().Be(10925m); // 11500 - 575
            payout.ProcessorId.Should().Be("InMemory");
            payout.ExternalRef.Should().StartWith("INMEMPAYOUT-");
            payout.SucceededAt.Should().NotBeNull();

            // Check commission Invoice
            var invoice = await db.Invoices
                .SingleOrDefaultAsync(i => i.PayoutId == payout.Id);
            invoice.Should().NotBeNull();
            invoice!.Kind.Should().Be(InvoiceKind.HostCommission);
            invoice.Number.Should().MatchRegex(@"^DS-COM-\d{4}-\d{5}$");
            invoice.NetMur.Should().Be(500m); // 575 / 1.15 = 500
            invoice.VatMur.Should().Be(75m); // 575 - 500 = 75
            invoice.GrossMur.Should().Be(575m);

            // Check both bookings marked as paid
            var booking1 = await db.Bookings.SingleAsync(b => b.Id == booking1Id);
            booking1.PayoutStatus.Should().Be(PayoutStatus.Paid);

            var booking2 = await db.Bookings.SingleAsync(b => b.Id == booking2Id);
            booking2.PayoutStatus.Should().Be(PayoutStatus.Paid);
        }
    }

    [Fact]
    public async Task RunAsync_BookingsNotYetEligible_AreSkipped()
    {
        using var factory = _fx.CreateFactory();

        // Create host, listing, and booking
        Guid hostUserId;
        Guid bookingId;

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<DodostaysDbContext>();

            // Create host user
            var host = new Dodostays.Api.Modules.Identity.Domain.DodostaysUser
            {
                Id = Guid.NewGuid(),
                DisplayName = "Test Host",
                Email = $"host-{Guid.NewGuid():N}@test.local",
                UserName = $"host-{Guid.NewGuid():N}@test.local",
                NormalizedUserName = $"HOST-{Guid.NewGuid():N}@TEST.LOCAL",
                NormalizedEmail = $"HOST-{Guid.NewGuid():N}@TEST.LOCAL",
                Role = UserRole.Host
            };
            db.Users.Add(host);
            await db.SaveChangesAsync();
            hostUserId = host.Id;

            // Create guest user
            var guest = new Dodostays.Api.Modules.Identity.Domain.DodostaysUser
            {
                Id = Guid.NewGuid(),
                DisplayName = "Test Guest",
                Email = $"guest-{Guid.NewGuid():N}@test.local",
                UserName = $"guest-{Guid.NewGuid():N}@test.local",
                NormalizedUserName = $"GUEST-{Guid.NewGuid():N}@TEST.LOCAL",
                NormalizedEmail = $"GUEST-{Guid.NewGuid():N}@TEST.LOCAL",
                Role = UserRole.Guest
            };
            db.Users.Add(guest);
            await db.SaveChangesAsync();

            // Create listing
            var listing = new Dodostays.Api.Modules.Listings.Domain.Listing
            {
                Id = Guid.NewGuid(),
                HostUserId = hostUserId,
                Title = "Test Villa 2",
                Description = "Test",
                PropertyType = PropertyType.Villa,
                Status = ListingStatus.Published,
                Region = "Flic en Flac",
                AddressLine = "456 Test Ave",
                Latitude = -20.3,
                Longitude = 57.4,
                Location = new NetTopologySuite.Geometries.Point(57.4, -20.3) { SRID = 4326 },
                Bedrooms = 3,
                Beds = 3,
                Bathrooms = 2,
                MaxGuests = 6,
                NightlyRateMur = 2000m,
                CleaningFeeMur = 0m,
                MinStayNights = 1
            };
            db.Listings.Add(listing);
            await db.SaveChangesAsync();

            // Create booking checked in LESS than 24h ago (NOT eligible)
            var booking = new Dodostays.Api.Modules.Bookings.Domain.Booking
            {
                Id = Guid.NewGuid(),
                ListingId = listing.Id,
                GuestUserId = guest.Id,
                HostUserId = hostUserId,
                State = BookingState.CheckedIn,
                PayoutStatus = PayoutStatus.NotEligible,
                CheckIn = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-2)),
                CheckOut = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(3)),
                NumGuests = 2,
                NightlyRateMur = 2000m,
                CleaningFeeMur = 0m,
                SubtotalMur = 10000m,
                VatMur = 1500m,
                TotalMur = 11500m,
                CheckedInAt = DateTimeOffset.UtcNow.AddHours(-1), // Only 1 hour ago - NOT eligible
                ConfirmedAt = DateTimeOffset.UtcNow.AddDays(-3)
            };
            db.Bookings.Add(booking);
            await db.SaveChangesAsync();
            bookingId = booking.Id;
        }

        // Run the payout job
        using (var scope = factory.Services.CreateScope())
        {
            var job = scope.ServiceProvider.GetRequiredService<BookingPayoutJob>();
            await job.RunAsync(CancellationToken.None);
        }

        // Assert no payout created for this host
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<DodostaysDbContext>();

            var payoutCount = await db.HostPayouts.CountAsync(p => p.HostUserId == hostUserId);
            payoutCount.Should().Be(0, "No payout should be created for bookings checked in less than 24h ago");

            var invoiceCount = await db.Invoices.CountAsync(i => i.BookingId == bookingId);
            invoiceCount.Should().Be(0, "No invoice should be generated");

            var booking = await db.Bookings.SingleAsync(b => b.Id == bookingId);
            booking.PayoutStatus.Should().Be(PayoutStatus.NotEligible, "Booking should remain NotEligible");
        }
    }
}
