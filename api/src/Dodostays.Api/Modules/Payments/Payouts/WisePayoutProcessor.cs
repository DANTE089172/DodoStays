using Microsoft.Extensions.Options;

namespace Dodostays.Api.Modules.Payments.Payouts;

public sealed class WisePayoutProcessor : IPayoutProcessor
{
    private readonly ILogger<WisePayoutProcessor> _logger;
    private readonly PayoutOptions _options;

    public WisePayoutProcessor(IOptions<PayoutOptions> options, ILogger<WisePayoutProcessor> logger)
    {
        _options = options.Value;
        _logger = logger;

        if (string.IsNullOrWhiteSpace(_options.WiseApiKey))
            throw new InvalidOperationException("Payouts:WiseApiKey is required when Provider is Wise.");

        if (string.IsNullOrWhiteSpace(_options.WiseProfileId))
            throw new InvalidOperationException("Payouts:WiseProfileId is required when Provider is Wise.");
    }

    public string ProcessorId => "Wise";

    public Task<PayoutReceipt> SendAsync(
        Guid hostUserId,
        decimal netAmountMur,
        string idempotencyKey,
        CancellationToken ct)
    {
        throw new NotImplementedException("Wise integration not yet wired — Plan 09 deferred until business account exists");
    }
}
