using System.Collections.Concurrent;
using Dodostays.Api.Contracts.Payments;

namespace Dodostays.Api.Modules.Payments.Processing;

public sealed class InMemoryPaymentProcessor : IPaymentProcessor
{
    private readonly ILogger<InMemoryPaymentProcessor> _logger;
    private readonly ConcurrentDictionary<string, PaymentReceiptDto> _cache = new();

    public InMemoryPaymentProcessor(ILogger<InMemoryPaymentProcessor> logger)
    {
        _logger = logger;
    }

    public string ProcessorId => "InMemory";

    public async Task<PaymentReceiptDto> AuthorizeAndCaptureAsync(
        Guid bookingId,
        decimal amountMur,
        string idempotencyKey,
        CancellationToken ct)
    {
        var cacheKey = $"{bookingId}|{idempotencyKey}";

        if (_cache.TryGetValue(cacheKey, out var cached))
        {
            _logger.LogDebug("Returning cached payment receipt for idempotency key {IdempotencyKey}", idempotencyKey);
            return cached;
        }

        await Task.Delay(200, ct);

        var receipt = new PaymentReceiptDto(
            PaymentId: Guid.NewGuid(),
            BookingId: bookingId,
            AmountMur: amountMur,
            Status: PaymentStatus.Captured,
            ExternalRef: $"INMEM-{Guid.NewGuid():N}"[..22].ToUpperInvariant(),
            ProcessorId: ProcessorId,
            SucceededAt: DateTimeOffset.UtcNow);

        _cache[cacheKey] = receipt;

        _logger.LogInformation("In-memory payment captured: {PaymentId} for booking {BookingId}, amount {Amount} MUR",
            receipt.PaymentId, bookingId, amountMur);

        return receipt;
    }
}
