using System.Net;
using System.Net.Http.Json;
using Xunit;
using FluentAssertions;
using Dodostays.Api.Contracts.Bookings;
using Dodostays.Api.Contracts.Listings;
using Dodostays.Api.IntegrationTests.Listings;

namespace Dodostays.Api.IntegrationTests.Bookings;

public class IcalOutboundFeedTests : IClassFixture<PostgresFixture>
{
    private readonly PostgresFixture _fx;
    public IcalOutboundFeedTests(PostgresFixture fx) => _fx = fx;

    [Fact]
    public async Task Host_can_get_signed_url_anonymous_can_fetch_feed()
    {
        using var factory = _fx.CreateFactory();
        var (host, _) = await ListingTestHelpers.CreateAuthenticatedHostAsync(factory);

        // Create + publish a listing
        var create = await host.PostAsJsonAsync("/api/listings", ListingTestHelpers.SampleListing());
        var listing = (await create.Content.ReadFromJsonAsync<ListingDto>())!;
        await host.PostAsync($"/api/listings/{listing.Id}/publish", null);

        // Host requests their signed URL
        var urlRes = await host.GetAsync($"/api/listings/{listing.Id}/ical-url");
        urlRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var url = (await urlRes.Content.ReadFromJsonAsync<HostIcalUrlResponse>())!.Url;
        url.Should().Contain($"/ical/listings/{listing.Id}.ics?token=");

        // Anon client fetches the feed via the relative path (PostgresFixture sets FeedBaseUrl to localhost:0)
        var anon = factory.CreateClient();
        var path = url.Replace("http://localhost:0", "");
        var feed = await anon.GetAsync(path);
        feed.StatusCode.Should().Be(HttpStatusCode.OK);
        feed.Content.Headers.ContentType?.MediaType.Should().Be("text/calendar");
        var body = await feed.Content.ReadAsStringAsync();
        body.Should().Contain("BEGIN:VCALENDAR");
        body.Should().Contain("END:VCALENDAR");
    }

    [Fact]
    public async Task Wrong_token_returns_401()
    {
        using var factory = _fx.CreateFactory();
        var (host, _) = await ListingTestHelpers.CreateAuthenticatedHostAsync(factory);
        var create = await host.PostAsJsonAsync("/api/listings", ListingTestHelpers.SampleListing());
        var listing = (await create.Content.ReadFromJsonAsync<ListingDto>())!;

        var anon = factory.CreateClient();
        var feed = await anon.GetAsync($"/ical/listings/{listing.Id}.ics?token=garbage");
        feed.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
