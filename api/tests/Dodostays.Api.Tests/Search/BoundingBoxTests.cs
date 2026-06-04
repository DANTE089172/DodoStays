using Xunit;
using FluentAssertions;
using Dodostays.Api.Contracts.Search;

namespace Dodostays.Api.Tests.Search;

public class BoundingBoxTests
{
    [Fact]
    public void TryParse_returns_valid_bbox()
    {
        var ok = BoundingBox.TryParse("-20.5,57.3,-20.2,57.6", out var bbox);
        ok.Should().BeTrue();
        bbox!.SouthLat.Should().Be(-20.5);
        bbox.WestLng.Should().Be(57.3);
        bbox.NorthLat.Should().Be(-20.2);
        bbox.EastLng.Should().Be(57.6);
    }

    [Theory]
    [InlineData("")]
    [InlineData("not,a,bbox")]
    [InlineData("1,2,3")]
    [InlineData("1,2,3,4,5")]
    [InlineData("a,b,c,d")]
    public void TryParse_returns_false_on_garbage(string input)
    {
        BoundingBox.TryParse(input, out var _).Should().BeFalse();
    }

    [Fact]
    public void Contains_returns_true_for_inside_point()
    {
        var bbox = new BoundingBox(-20.5, 57.3, -20.2, 57.6);
        bbox.Contains(-20.3, 57.4).Should().BeTrue();
    }

    [Fact]
    public void Contains_returns_false_for_outside_point()
    {
        var bbox = new BoundingBox(-20.5, 57.3, -20.2, 57.6);
        bbox.Contains(-20.0, 57.0).Should().BeFalse();
    }

    [Fact]
    public void IsWithinMauritius_is_true_for_typical_bbox()
    {
        new BoundingBox(-20.5, 57.3, -20.2, 57.6).IsWithinMauritius().Should().BeTrue();
    }

    [Fact]
    public void IsWithinMauritius_is_false_for_australian_bbox()
    {
        new BoundingBox(-34.0, 151.0, -33.5, 151.5).IsWithinMauritius().Should().BeFalse();
    }
}
