using Dodostays.Api.Contracts.Bookings;

namespace Dodostays.Api.Modules.Bookings.Services;

public sealed class PricingService
{
    public const decimal MauritiusVatRate = 0.15m;

    public PriceQuote Quote(decimal nightlyMur, decimal cleaningMur, DateRange dates)
    {
        if (!dates.IsValid) throw new ArgumentException("Invalid date range.", nameof(dates));
        var nights = dates.Nights;
        var subtotal = (nightlyMur * nights) + cleaningMur;
        var vat = Math.Round(subtotal * MauritiusVatRate, 2, MidpointRounding.ToEven);
        var total = subtotal + vat;
        return new PriceQuote(nights, subtotal, vat, total);
    }
}

public readonly record struct PriceQuote(
    int Nights,
    decimal SubtotalMur,
    decimal VatMur,
    decimal TotalMur);
