using System.Net;
using System.Net.Http.Json;
using Xunit;
using FluentAssertions;
using Dodostays.Api.Contracts.Listings;
using Dodostays.Api.IntegrationTests.Listings;

namespace Dodostays.Api.IntegrationTests.Search;

public class ListingSearchBboxFlowTests : IClassFixture<PostgresFixture>
{
    private readonly PostgresFixture _fx;
    public ListingSearchBboxFlowTests(PostgresFixture fx) => _fx = fx;

    [Fact]
    public async Task Bbox_filter_returns_only_listings_inside()
    {
        using var factory = _fx.CreateFactory();
        var (host, _) = await ListingTestHelpers.CreateAuthenticatedHostAsync(factory);

        var fef = ListingTestHelpers.SampleListing("flic-en-flac")
            with { Title = "FEF in bbox", Latitude = -20.27, Longitude = 57.36 };
        var fefRes = await host.PostAsJsonAsync("/api/listings", fef);
        var fefDto = await fefRes.Content.ReadFromJsonAsync<ListingDto>();
        await host.PostAsync($"/api/listings/{fefDto!.Id}/publish", null);

        var gb = ListingTestHelpers.SampleListing("grand-baie")
            with { Title = "GB out of bbox", Latitude = -20.01, Longitude = 57.58 };
        var gbRes = await host.PostAsJsonAsync("/api/listings", gb);
        var gbDto = await gbRes.Content.ReadFromJsonAsync<ListingDto>();
        await host.PostAsync($"/api/listings/{gbDto!.Id}/publish", null);

        var anon = factory.CreateClient();
        var res = await anon.GetAsync("/api/listings?bbox=-20.31,57.32,-20.23,57.40");
        res.StatusCode.Should().Be(HttpStatusCode.OK);
        var search = await res.Content.ReadFromJsonAsync<ListingSearchResponse>();
        search!.Items.Should().Contain(i => i.Title == "FEF in bbox");
        search.Items.Should().NotContain(i => i.Title == "GB out of bbox");
    }
}
