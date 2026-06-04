using Xunit;
using FluentAssertions;
using Dodostays.Api.Contracts.Listings;
using Dodostays.Api.Modules.Listings.Domain;

namespace Dodostays.Api.Tests.Listings;

public class ListingVibeClassifierTests
{
    [Fact]
    public void Wave_when_BeachAccess_amenity()
    {
        var v = ListingVibeClassifier.Classify(
            region: "tamarin",
            description: "Quiet villa.",
            amenities: new[] { Amenity.BeachAccess, Amenity.Pool });
        v.Should().Be(ListingVibe.Wave);
    }

    [Fact]
    public void Mountain_when_le_morne_region_no_beach()
    {
        var v = ListingVibeClassifier.Classify(
            region: "le-morne",
            description: "Foothills retreat.",
            amenities: Array.Empty<Amenity>());
        v.Should().Be(ListingVibe.Mountain);
    }

    [Fact]
    public void Mountain_when_description_mentions_view_or_mountain()
    {
        var v = ListingVibeClassifier.Classify(
            region: "tamarin",
            description: "Stunning mountain views.",
            amenities: Array.Empty<Amenity>());
        v.Should().Be(ListingVibe.Mountain);
    }

    [Fact]
    public void Leaf_when_garden_and_no_beach_and_not_grand_baie()
    {
        var v = ListingVibeClassifier.Classify(
            region: "albion",
            description: "Surrounded by sugar cane.",
            amenities: new[] { Amenity.Garden });
        v.Should().Be(ListingVibe.Leaf);
    }

    [Fact]
    public void Town_when_grand_baie_no_other_match()
    {
        var v = ListingVibeClassifier.Classify(
            region: "grand-baie",
            description: "Walking distance to restaurants.",
            amenities: new[] { Amenity.Wifi });
        v.Should().Be(ListingVibe.Town);
    }

    [Fact]
    public void Mixed_when_no_rule_matches()
    {
        var v = ListingVibeClassifier.Classify(
            region: "blue-bay",
            description: "Cosy place.",
            amenities: new[] { Amenity.Wifi });
        v.Should().Be(ListingVibe.Mixed);
    }

    [Theory]
    [InlineData(2500, PriceBand.Budget)]
    [InlineData(3000, PriceBand.Budget)]
    [InlineData(3001, PriceBand.Mid)]
    [InlineData(7000, PriceBand.Mid)]
    [InlineData(7001, PriceBand.Premium)]
    [InlineData(15000, PriceBand.Premium)]
    public void PriceBandFor_buckets_by_thresholds(decimal nightly, PriceBand expected)
    {
        ListingVibeClassifier.PriceBandFor(nightly).Should().Be(expected);
    }
}
