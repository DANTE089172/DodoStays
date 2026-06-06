namespace Dodostays.Api.Modules.Payments.Fx;

public interface IFxRateProvider
{
    string ProviderId { get; }

    /// <summary>
    /// Returns the FX rate from `fromCurrency` to `toCurrency` at the current moment.
    /// e.g. GetRateAsync("MUR", "EUR") returns ~0.02 (1 MUR = 0.02 EUR).
    /// Same currency returns 1.0.
    /// Cross-currency throws NotSupportedException at v1 — Plan 06 unlocks real conversion.
    /// </summary>
    Task<decimal> GetRateAsync(string fromCurrency, string toCurrency, CancellationToken ct);
}
