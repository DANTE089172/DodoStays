using Xunit;
using FluentAssertions;
using Dodostays.Api.Contracts.Bookings;

namespace Dodostays.Api.Tests.Bookings;

public class DateRangeTests
{
    [Fact]
    public void Nights_counts_correctly()
    {
        var r = new DateRange(new(2026, 6, 10), new(2026, 6, 13));
        r.Nights.Should().Be(3);
    }

    [Fact]
    public void IsValid_rejects_zero_nights()
    {
        var r = new DateRange(new(2026, 6, 10), new(2026, 6, 10));
        r.IsValid.Should().BeFalse();
    }

    [Fact]
    public void IsValid_rejects_reverse_range()
    {
        var r = new DateRange(new(2026, 6, 13), new(2026, 6, 10));
        r.IsValid.Should().BeFalse();
    }

    [Fact]
    public void IsValid_accepts_one_year()
    {
        var r = new DateRange(new(2026, 6, 10), new(2027, 6, 10));
        r.IsValid.Should().BeTrue();
    }

    [Fact]
    public void IsValid_rejects_over_one_year()
    {
        var r = new DateRange(new(2026, 6, 10), new(2027, 6, 11));
        r.IsValid.Should().BeFalse();
    }

    [Fact]
    public void Overlaps_returns_true_for_partial_overlap()
    {
        var a = new DateRange(new(2026, 6, 10), new(2026, 6, 15));
        var b = new DateRange(new(2026, 6, 13), new(2026, 6, 18));
        a.Overlaps(b).Should().BeTrue();
        b.Overlaps(a).Should().BeTrue();
    }

    [Fact]
    public void Overlaps_returns_false_for_back_to_back()
    {
        var a = new DateRange(new(2026, 6, 10), new(2026, 6, 13));
        var b = new DateRange(new(2026, 6, 13), new(2026, 6, 16));
        a.Overlaps(b).Should().BeFalse();
        b.Overlaps(a).Should().BeFalse();
    }

    [Fact]
    public void Overlaps_returns_false_for_disjoint()
    {
        var a = new DateRange(new(2026, 6, 1), new(2026, 6, 5));
        var b = new DateRange(new(2026, 6, 10), new(2026, 6, 15));
        a.Overlaps(b).Should().BeFalse();
    }
}
