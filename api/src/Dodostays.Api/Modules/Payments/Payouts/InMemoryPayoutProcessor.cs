using System.Collections.Concurrent;
using Dodostays.Api.Contracts.Payments;

namespace Dodostays.Api.Modules.Payments.Payouts;

public sealed class InMemoryPayoutProcessor : IPayoutProcessor
{
    private readonly ILogger<InMemoryPayoutProcessor> _logger;
    private readonly ConcurrentDictionary<(Guid, string), PayoutReceipt> _cache = new();

    public InMemoryPayoutProcessor(ILogger<InMemoryPayoutProcessor> logger)
    {
        _logger = logger;
    }

    public string ProcessorId => "InMemory";

    public async Task<PayoutReceipt> SendAsync(
        Guid hostUserId,
        decimal netAmountMur,
        string idempotencyKey,
        CancellationToken ct)
    {
        var cacheKey = (hostUserId, idempotencyKey);

        if (_cache.TryGetValue(cacheKey, out var cached))
        {
            _logger.LogDebug("Returning cached payout receipt for idempotency key {IdempotencyKey}", idempotencyKey);
            return cached;
        }

        await Task.Delay(200, ct);

        var receipt = new PayoutReceipt(
            HostUserId: hostUserId,
            NetAmountMur: netAmountMur,
            Status: PayoutStatus.Paid,
            ExternalRef: $"INMEMPAYOUT-{Guid.NewGuid():N}"[..22].ToUpperInvariant(),
            ProcessorId: ProcessorId,
            SucceededAt: DateTimeOffset.UtcNow);

        _cache[cacheKey] = receipt;

        _logger.LogInformation("In-memory payout sent: host {HostUserId}, amount {Amount} MUR",
            hostUserId, netAmountMur);

        return receipt;
    }
}
