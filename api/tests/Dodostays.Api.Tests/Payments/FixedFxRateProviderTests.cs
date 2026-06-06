using Xunit;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Dodostays.Api.Modules.Payments.Fx;

namespace Dodostays.Api.Tests.Payments;

public class FixedFxRateProviderTests
{
    [Fact]
    public async Task GetRate_SameCurrency_ReturnsOne()
    {
        var provider = new FixedFxRateProvider(NullLogger<FixedFxRateProvider>.Instance);

        var rate = await provider.GetRateAsync("MUR", "MUR", default);

        rate.Should().Be(1.0m);
    }

    [Fact]
    public async Task GetRate_SameCurrency_CaseInsensitive_ReturnsOne()
    {
        var provider = new FixedFxRateProvider(NullLogger<FixedFxRateProvider>.Instance);

        var rateMur = await provider.GetRateAsync("mur", "MUR", default);
        var rateEur = await provider.GetRateAsync("EUR", "eur", default);

        rateMur.Should().Be(1.0m);
        rateEur.Should().Be(1.0m);
    }

    [Fact]
    public async Task GetRate_DifferentCurrencies_Throws()
    {
        var provider = new FixedFxRateProvider(NullLogger<FixedFxRateProvider>.Instance);

        Func<Task> act = () => provider.GetRateAsync("MUR", "EUR", default);

        await act.Should().ThrowAsync<NotSupportedException>()
            .WithMessage("*Plan 06*");
    }
}
