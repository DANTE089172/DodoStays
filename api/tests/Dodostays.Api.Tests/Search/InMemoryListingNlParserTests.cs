using Xunit;
using FluentAssertions;
using Dodostays.Api.Contracts.Listings;
using Dodostays.Api.Contracts.Search;
using Dodostays.Api.Modules.Search.Parsers;

namespace Dodostays.Api.Tests.Search;

public class InMemoryListingNlParserTests
{
    private readonly InMemoryListingNlParser _parser = new();

    [Fact]
    public async Task Extracts_region_property_type_bedrooms_amenities_and_max_price()
    {
        var (filters, confidence, ack) = await _parser.ParseAsync(
            "3 bedroom villa in Flic en Flac with pool under 5000 mur per night",
            null,
            CancellationToken.None);

        filters.Region.Should().Be("flic-en-flac");
        filters.PropertyType.Should().Be(PropertyType.Villa);
        filters.MinBedrooms.Should().Be(3);
        filters.MaxNightlyMur.Should().Be(5000m);
        filters.RequiredAmenities.Should().Contain(Amenity.Pool);
        confidence.Should().BeGreaterThanOrEqualTo(0.5);
        ack.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Extracts_max_guests_from_phrase()
    {
        var (filters, _, _) = await _parser.ParseAsync(
            "apartment for 4 guests in grand baie", null, CancellationToken.None);
        filters.MinGuests.Should().Be(4);
        filters.PropertyType.Should().Be(PropertyType.Apartment);
        filters.Region.Should().Be("grand-baie");
    }

    [Fact]
    public async Task Extracts_multiple_amenities()
    {
        var (filters, _, _) = await _parser.ParseAsync(
            "villa with pool and wifi and air conditioning", null, CancellationToken.None);
        filters.RequiredAmenities.Should().Contain(Amenity.Pool);
        filters.RequiredAmenities.Should().Contain(Amenity.Wifi);
        filters.RequiredAmenities.Should().Contain(Amenity.AirCon);
    }

    [Fact]
    public async Task Detects_verified_only_phrasing()
    {
        var (filters, _, _) = await _parser.ParseAsync("verified villas only with pool", null, CancellationToken.None);
        filters.VerifiedOnly.Should().BeTrue();
    }

    [Fact]
    public async Task Returns_low_confidence_for_unparseable_input()
    {
        var (filters, confidence, _) = await _parser.ParseAsync("asdfghjkl qwerty", null, CancellationToken.None);
        confidence.Should().BeLessThan(0.4);
        filters.UnknownTokens.Should().NotBeEmpty();
    }

    [Fact]
    public async Task Merges_with_current_filters_when_provided()
    {
        var current = new ParsedFilters(
            Region: "tamarin", PropertyType: null,
            MinBedrooms: 2, MinGuests: null,
            MaxNightlyMur: null, MinNightlyMur: null,
            RequiredAmenities: Array.Empty<Amenity>(),
            CheckIn: null, CheckOut: null,
            VerifiedOnly: false, UnknownTokens: Array.Empty<string>());

        var (filters, _, _) = await _parser.ParseAsync("with pool", current, CancellationToken.None);
        filters.Region.Should().Be("tamarin");
        filters.MinBedrooms.Should().Be(2);
        filters.RequiredAmenities.Should().Contain(Amenity.Pool);
    }
}
