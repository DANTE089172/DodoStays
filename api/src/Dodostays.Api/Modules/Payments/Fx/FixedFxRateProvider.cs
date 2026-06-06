using Microsoft.Extensions.Logging;

namespace Dodostays.Api.Modules.Payments.Fx;

public sealed class FixedFxRateProvider : IFxRateProvider
{
    private readonly ILogger<FixedFxRateProvider> _logger;

    public FixedFxRateProvider(ILogger<FixedFxRateProvider> logger)
    {
        _logger = logger;
    }

    public string ProviderId => "Fixed";

    public Task<decimal> GetRateAsync(string fromCurrency, string toCurrency, CancellationToken ct)
    {
        if (string.Equals(fromCurrency, toCurrency, StringComparison.OrdinalIgnoreCase))
        {
            return Task.FromResult(1.0m);
        }

        throw new NotSupportedException(
            $"FixedFxRateProvider does not support {fromCurrency} → {toCurrency}. Multi-currency conversion deferred to Plan 06.");
    }
}
