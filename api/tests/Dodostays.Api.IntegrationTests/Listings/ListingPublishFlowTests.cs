using System.Net;
using System.Net.Http.Json;
using Xunit;
using FluentAssertions;
using Dodostays.Api.Contracts.Listings;

namespace Dodostays.Api.IntegrationTests.Listings;

public class ListingPublishFlowTests : IClassFixture<PostgresFixture>
{
    private readonly PostgresFixture _fx;

    public ListingPublishFlowTests(PostgresFixture fx) => _fx = fx;

    [Fact]
    public async Task Draft_listing_is_invisible_to_anonymous_get()
    {
        using var factory = _fx.CreateFactory();
        var (host, _) = await ListingTestHelpers.CreateAuthenticatedHostAsync(factory);
        var create = await host.PostAsJsonAsync("/api/listings", ListingTestHelpers.SampleListing());
        var dto = await create.Content.ReadFromJsonAsync<ListingDto>();

        var anon = factory.CreateClient();
        var res = await anon.GetAsync($"/api/listings/{dto!.Id}");

        res.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Published_listing_is_visible_to_anonymous_get()
    {
        using var factory = _fx.CreateFactory();
        var (host, _) = await ListingTestHelpers.CreateAuthenticatedHostAsync(factory);
        var create = await host.PostAsJsonAsync("/api/listings", ListingTestHelpers.SampleListing());
        var dto = await create.Content.ReadFromJsonAsync<ListingDto>();
        var pub = await host.PostAsync($"/api/listings/{dto!.Id}/publish", null);
        pub.StatusCode.Should().Be(HttpStatusCode.OK);

        var anon = factory.CreateClient();
        var res = await anon.GetAsync($"/api/listings/{dto.Id}");

        res.StatusCode.Should().Be(HttpStatusCode.OK);
        var fetched = await res.Content.ReadFromJsonAsync<ListingDto>();
        fetched!.Status.Should().Be(ListingStatus.Published);
    }

    [Fact]
    public async Task Host_can_unpublish()
    {
        using var factory = _fx.CreateFactory();
        var (host, _) = await ListingTestHelpers.CreateAuthenticatedHostAsync(factory);
        var create = await host.PostAsJsonAsync("/api/listings", ListingTestHelpers.SampleListing());
        var dto = await create.Content.ReadFromJsonAsync<ListingDto>();
        await host.PostAsync($"/api/listings/{dto!.Id}/publish", null);

        var unpub = await host.PostAsync($"/api/listings/{dto.Id}/unpublish", null);

        unpub.StatusCode.Should().Be(HttpStatusCode.OK);
        var fetched = await unpub.Content.ReadFromJsonAsync<ListingDto>();
        fetched!.Status.Should().Be(ListingStatus.Draft);
    }
}
