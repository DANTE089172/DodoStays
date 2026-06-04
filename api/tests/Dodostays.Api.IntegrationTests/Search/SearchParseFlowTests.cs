using System.Net;
using System.Net.Http.Json;
using Xunit;
using FluentAssertions;
using Dodostays.Api.Contracts.Listings;
using Dodostays.Api.Contracts.Search;

namespace Dodostays.Api.IntegrationTests.Search;

public class SearchParseFlowTests : IClassFixture<PostgresFixture>
{
    private readonly PostgresFixture _fx;
    public SearchParseFlowTests(PostgresFixture fx) => _fx = fx;

    [Fact]
    public async Task Parse_extracts_filters_and_returns_bbox_hint()
    {
        using var factory = _fx.CreateFactory();
        var client = factory.CreateClient();
        var req = new SearchParseRequest("3 bedroom villa in flic en flac with pool under 5000 mur");
        var res = await client.PostAsJsonAsync("/api/search/parse", req);
        res.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await res.Content.ReadFromJsonAsync<SearchParseResponse>();
        body!.Filters.Region.Should().Be("flic-en-flac");
        body.Filters.PropertyType.Should().Be(PropertyType.Villa);
        body.Filters.MinBedrooms.Should().Be(3);
        body.Filters.MaxNightlyMur.Should().Be(5000m);
        body.Filters.RequiredAmenities.Should().Contain(Amenity.Pool);
        body.Confidence.Should().BeGreaterThanOrEqualTo(0.5);
        body.Acknowledgement.Should().NotBeNullOrEmpty();
        body.BoundingBoxHint.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Parse_returns_400_on_empty_text()
    {
        using var factory = _fx.CreateFactory();
        var client = factory.CreateClient();
        var res = await client.PostAsJsonAsync("/api/search/parse", new SearchParseRequest(""));
        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
