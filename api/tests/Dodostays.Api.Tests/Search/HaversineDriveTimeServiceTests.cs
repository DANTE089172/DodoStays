using Xunit;
using FluentAssertions;
using Dodostays.Api.Contracts.Search;
using Dodostays.Api.Modules.Search.DriveTime;

namespace Dodostays.Api.Tests.Search;

public class HaversineDriveTimeServiceTests
{
    private readonly HaversineDriveTimeService _svc = new();

    [Fact]
    public async Task EstimateMinutesAsync_returns_positive_for_distinct_points()
    {
        var anchors = new[] { new Anchor(-20.27, 57.36, "FEF") };
        var minutes = await _svc.EstimateMinutesAsync(
            originLat: -20.0117, originLng: 57.5800,
            anchors: anchors, CancellationToken.None);
        minutes.Should().BeGreaterThan(15);
        minutes.Should().BeLessThan(120);
    }

    [Fact]
    public async Task EstimateMinutesAsync_returns_zero_for_same_point()
    {
        var anchors = new[] { new Anchor(-20.27, 57.36, "FEF") };
        var minutes = await _svc.EstimateMinutesAsync(-20.27, 57.36, anchors, CancellationToken.None);
        minutes.Should().BeLessThan(2);
    }

    [Fact]
    public async Task EstimateMinutesAsync_returns_min_across_multiple_anchors()
    {
        var anchors = new[]
        {
            new Anchor(-20.0117, 57.58, "Grand Baie"),
            new Anchor(-20.27, 57.36, "FEF"),
        };
        var minutes = await _svc.EstimateMinutesAsync(-20.27, 57.36, anchors, CancellationToken.None);
        minutes.Should().BeLessThan(2);
    }

    [Fact]
    public async Task EstimateMinutesAsync_returns_int_max_when_no_anchors()
    {
        var minutes = await _svc.EstimateMinutesAsync(-20.0, 57.5, Array.Empty<Anchor>(), CancellationToken.None);
        minutes.Should().Be(int.MaxValue);
    }
}
