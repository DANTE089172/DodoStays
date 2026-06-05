using Xunit;
using FluentAssertions;
using Dodostays.Api.Contracts.Bookings;
using Dodostays.Api.Modules.Bookings.Services;

namespace Dodostays.Api.Tests.Bookings;

public class PricingServiceTests
{
    private readonly PricingService _svc = new();

    [Fact]
    public void Computes_subtotal_vat_and_total()
    {
        var dates = new DateRange(new(2026, 6, 10), new(2026, 6, 13));
        var p = _svc.Quote(nightlyMur: 5000m, cleaningMur: 800m, dates: dates);

        p.Nights.Should().Be(3);
        p.SubtotalMur.Should().Be(15800m);
        p.VatMur.Should().Be(2370m);
        p.TotalMur.Should().Be(18170m);
    }

    [Fact]
    public void Zero_cleaning_fee_handled()
    {
        var dates = new DateRange(new(2026, 6, 10), new(2026, 6, 12));
        var p = _svc.Quote(5000m, 0m, dates);
        p.SubtotalMur.Should().Be(10000m);
        p.VatMur.Should().Be(1500m);
        p.TotalMur.Should().Be(11500m);
    }

    [Fact]
    public void Throws_on_invalid_date_range()
    {
        var dates = new DateRange(new(2026, 6, 13), new(2026, 6, 10));
        Action act = () => _svc.Quote(5000m, 800m, dates);
        act.Should().Throw<ArgumentException>();
    }
}
