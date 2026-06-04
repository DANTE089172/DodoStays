using System.Net.Http.Json;
using Xunit;
using FluentAssertions;
using Dodostays.Api.Contracts.Listings;
using Dodostays.Api.IntegrationTests.Listings;

namespace Dodostays.Api.IntegrationTests.Search;

public class ListingSearchAnchorFlowTests : IClassFixture<PostgresFixture>
{
    private readonly PostgresFixture _fx;
    public ListingSearchAnchorFlowTests(PostgresFixture fx) => _fx = fx;

    [Fact]
    public async Task Anchor_re_sorts_results_by_drive_time()
    {
        using var factory = _fx.CreateFactory();
        var (host, _) = await ListingTestHelpers.CreateAuthenticatedHostAsync(factory);

        var fef = ListingTestHelpers.SampleListing("flic-en-flac")
            with { Title = "Near anchor", Latitude = -20.27, Longitude = 57.36 };
        var fefDto = (await (await host.PostAsJsonAsync("/api/listings", fef)).Content.ReadFromJsonAsync<ListingDto>())!;
        await host.PostAsync($"/api/listings/{fefDto.Id}/publish", null);

        var gb = ListingTestHelpers.SampleListing("grand-baie")
            with { Title = "Far from anchor", Latitude = -20.01, Longitude = 57.58 };
        var gbDto = (await (await host.PostAsJsonAsync("/api/listings", gb)).Content.ReadFromJsonAsync<ListingDto>())!;
        await host.PostAsync($"/api/listings/{gbDto.Id}/publish", null);

        var anon = factory.CreateClient();
        var anchored = await anon.GetAsync("/api/listings?anchors=-20.27,57.36,Beach");
        var page = await anchored.Content.ReadFromJsonAsync<ListingSearchResponse>();
        page!.Items.First().Title.Should().Be("Near anchor");
        page.Items.First().DriveTimeMinutes.Should().NotBeNull();
        page.Items.First().DriveTimeMinutes!.Value.Should().BeLessThan(page.Items.Last().DriveTimeMinutes!.Value);
    }

    [Fact]
    public async Task DriveTimeMinutes_is_null_when_no_anchors()
    {
        using var factory = _fx.CreateFactory();
        var (host, _) = await ListingTestHelpers.CreateAuthenticatedHostAsync(factory);
        var dto = ListingTestHelpers.SampleListing("flic-en-flac");
        var created = (await (await host.PostAsJsonAsync("/api/listings", dto)).Content.ReadFromJsonAsync<ListingDto>())!;
        await host.PostAsync($"/api/listings/{created.Id}/publish", null);

        var anon = factory.CreateClient();
        var res = await anon.GetAsync("/api/listings");
        var page = await res.Content.ReadFromJsonAsync<ListingSearchResponse>();
        page!.Items.Should().OnlyContain(i => i.DriveTimeMinutes == null);
    }
}
