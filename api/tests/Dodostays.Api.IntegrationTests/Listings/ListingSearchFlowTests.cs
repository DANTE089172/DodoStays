using System.Net;
using System.Net.Http.Json;
using Xunit;
using FluentAssertions;
using Dodostays.Api.Contracts.Listings;

namespace Dodostays.Api.IntegrationTests.Listings;

public class ListingSearchFlowTests : IClassFixture<PostgresFixture>
{
    private readonly PostgresFixture _fx;

    public ListingSearchFlowTests(PostgresFixture fx) => _fx = fx;

    [Fact]
    public async Task Search_returns_only_published_listings_filtered_by_region()
    {
        using var factory = _fx.CreateFactory();
        var (host, _) = await ListingTestHelpers.CreateAuthenticatedHostAsync(factory);

        var fefDraft = await host.PostAsJsonAsync("/api/listings",
            ListingTestHelpers.SampleListing("flic-en-flac") with { Title = "FEF Draft" });
        var fefPub = await host.PostAsJsonAsync("/api/listings",
            ListingTestHelpers.SampleListing("flic-en-flac") with { Title = "FEF Published" });
        var fefPubDto = await fefPub.Content.ReadFromJsonAsync<ListingDto>();
        await host.PostAsync($"/api/listings/{fefPubDto!.Id}/publish", null);

        var gb = await host.PostAsJsonAsync("/api/listings",
            ListingTestHelpers.SampleListing("grand-baie") with { Title = "GB Published" });
        var gbDto = await gb.Content.ReadFromJsonAsync<ListingDto>();
        await host.PostAsync($"/api/listings/{gbDto!.Id}/publish", null);

        var anon = factory.CreateClient();
        var res = await anon.GetAsync("/api/listings?region=flic-en-flac");
        res.StatusCode.Should().Be(HttpStatusCode.OK);
        var search = await res.Content.ReadFromJsonAsync<ListingSearchResponse>();
        search!.Items.Should().ContainSingle(i => i.Title == "FEF Published");
        search.Items.Should().NotContain(i => i.Title == "FEF Draft");
        search.Items.Should().NotContain(i => i.Title == "GB Published");
    }

    [Fact]
    public async Task Search_filters_by_amenity_and_max_price()
    {
        using var factory = _fx.CreateFactory();
        var (host, _) = await ListingTestHelpers.CreateAuthenticatedHostAsync(factory);

        var pool = await host.PostAsJsonAsync("/api/listings",
            ListingTestHelpers.SampleListing() with
            {
                Title = "PoolVilla",
                Amenities = new[] { Amenity.Pool, Amenity.Wifi },
                NightlyRateMur = 4000m
            });
        var poolDto = await pool.Content.ReadFromJsonAsync<ListingDto>();
        await host.PostAsync($"/api/listings/{poolDto!.Id}/publish", null);

        var noPool = await host.PostAsJsonAsync("/api/listings",
            ListingTestHelpers.SampleListing() with
            {
                Title = "NoPool",
                Amenities = new[] { Amenity.Wifi },
                NightlyRateMur = 3000m
            });
        var npDto = await noPool.Content.ReadFromJsonAsync<ListingDto>();
        await host.PostAsync($"/api/listings/{npDto!.Id}/publish", null);

        var anon = factory.CreateClient();
        var res = await anon.GetAsync("/api/listings?amenities=Pool&maxNightlyMur=5000");
        var search = await res.Content.ReadFromJsonAsync<ListingSearchResponse>();
        search!.Items.Should().ContainSingle(i => i.Title == "PoolVilla");
        search.Items.Should().NotContain(i => i.Title == "NoPool");
    }

    [Fact]
    public async Task Search_pagination_returns_correct_metadata()
    {
        using var factory = _fx.CreateFactory();
        var (host, _) = await ListingTestHelpers.CreateAuthenticatedHostAsync(factory);

        for (var i = 0; i < 3; i++)
        {
            var c = await host.PostAsJsonAsync("/api/listings",
                ListingTestHelpers.SampleListing() with { Title = $"Listing {i}" });
            var d = await c.Content.ReadFromJsonAsync<ListingDto>();
            await host.PostAsync($"/api/listings/{d!.Id}/publish", null);
        }

        var anon = factory.CreateClient();
        var res = await anon.GetAsync("/api/listings?pageSize=2&page=1");
        var search = await res.Content.ReadFromJsonAsync<ListingSearchResponse>();
        search!.Items.Count.Should().Be(2);
        search.TotalCount.Should().BeGreaterThanOrEqualTo(3);
        search.TotalPages.Should().BeGreaterThanOrEqualTo(2);
    }
}
