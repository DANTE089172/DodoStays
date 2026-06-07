using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Xunit;
using Dodostays.Api.Contracts.Bookings;
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Contracts.Listings;
using Dodostays.Api.IntegrationTests.Listings;
using Dodostays.Api.Modules.Common.Database;

namespace Dodostays.Api.IntegrationTests.Payments;

public class InvoiceDownloadFlowTests : IClassFixture<PostgresFixture>
{
    private readonly PostgresFixture _fx;
    public InvoiceDownloadFlowTests(PostgresFixture fx) => _fx = fx;

    [Fact]
    public async Task Download_AsBookingGuest_Returns200WithPdfBytes()
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

        // Confirm booking (which generates invoice)
        var confirmRequest = new ConfirmBookingRequest(holdDto.BookingId);
        var confirmResponse = await guest.PostAsJsonAsync("/api/bookings/confirm", confirmRequest);
        confirmResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var confirmedDto = (await confirmResponse.Content.ReadFromJsonAsync<BookingDto>())!;

        // Get the invoice number from DB
        string invoiceNumber;
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<DodostaysDbContext>();
            var invoice = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.SingleAsync(
                db.Invoices.Where(i => i.BookingId == holdDto.BookingId));
            invoiceNumber = invoice.Number;
        }

        // Act: Download invoice as guest
        var downloadResponse = await guest.GetAsync($"/api/bookings/{holdDto.BookingId}/invoice");

        // Assert: HTTP 200
        downloadResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        // Assert: Content-Type is PDF
        downloadResponse.Content.Headers.ContentType!.MediaType.Should().Be("application/pdf");

        // Assert: Body starts with PDF magic bytes
        var bytes = await downloadResponse.Content.ReadAsByteArrayAsync();
        bytes.Should().NotBeEmpty();
        bytes.Length.Should().BeGreaterThan(4);
        var header = System.Text.Encoding.ASCII.GetString(bytes.Take(4).ToArray());
        header.Should().Be("%PDF");

        // Assert: Content-Disposition includes the invoice number
        var contentDisposition = downloadResponse.Content.Headers.ContentDisposition;
        contentDisposition.Should().NotBeNull();
        contentDisposition!.FileName.Should().Contain(invoiceNumber);
    }

    [Fact]
    public async Task Download_AsBookingHost_Returns200()
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

        // Confirm booking (which generates invoice)
        var confirmRequest = new ConfirmBookingRequest(holdDto.BookingId);
        var confirmResponse = await guest.PostAsJsonAsync("/api/bookings/confirm", confirmRequest);
        confirmResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        // Act: Download invoice as host (not guest)
        var downloadResponse = await host.GetAsync($"/api/bookings/{holdDto.BookingId}/invoice");

        // Assert: HTTP 200
        downloadResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        // Assert: Content-Type is PDF
        downloadResponse.Content.Headers.ContentType!.MediaType.Should().Be("application/pdf");
    }

    [Fact]
    public async Task Download_AsUnrelatedUser_Returns403()
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

        // Confirm booking (which generates invoice)
        var confirmRequest = new ConfirmBookingRequest(holdDto.BookingId);
        var confirmResponse = await guest.PostAsJsonAsync("/api/bookings/confirm", confirmRequest);
        confirmResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        // Create a third user (neither guest nor host)
        var (unrelatedUser, _) = await CreateAuthenticatedGuestAsync(factory);

        // Act: Try to download invoice as unrelated user
        var downloadResponse = await unrelatedUser.GetAsync($"/api/bookings/{holdDto.BookingId}/invoice");

        // Assert: HTTP 403
        downloadResponse.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetBookingById_AfterConfirm_IncludesPaymentSummaryWithInvoiceNumber()
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

        // Confirm booking (which generates invoice)
        var confirmRequest = new ConfirmBookingRequest(holdDto.BookingId);
        var confirmResponse = await guest.PostAsJsonAsync("/api/bookings/confirm", confirmRequest);
        confirmResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        // Act: Get booking by ID as guest
        var getResponse = await guest.GetAsync($"/api/bookings/{holdDto.BookingId}");

        // Assert: HTTP 200
        getResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var bookingDto = (await getResponse.Content.ReadFromJsonAsync<BookingDto>())!;

        // Assert: PaymentSummary is populated
        bookingDto.PaymentSummary.Should().NotBeNull();
        bookingDto.PaymentSummary!.InvoiceNumber.Should().NotBeNullOrEmpty();
        bookingDto.PaymentSummary.InvoiceNumber.Should().MatchRegex(@"^DS-\d{4}-\d{5}$");
        bookingDto.PaymentSummary.PaymentStatus.Should().Be(Contracts.Payments.PaymentStatus.Captured);
        bookingDto.PaymentSummary.AmountPaidMur.Should().Be(bookingDto.TotalMur);
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
