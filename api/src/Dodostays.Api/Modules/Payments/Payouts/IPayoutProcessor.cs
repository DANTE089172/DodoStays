using Dodostays.Api.Contracts.Payments;

namespace Dodostays.Api.Modules.Payments.Payouts;

public interface IPayoutProcessor
{
    string ProcessorId { get; }

    Task<PayoutReceipt> SendAsync(
        Guid hostUserId,
        decimal netAmountMur,
        string idempotencyKey,
        CancellationToken ct);
}

public sealed record PayoutReceipt(
    Guid HostUserId,
    decimal NetAmountMur,
    PayoutStatus Status,
    string ExternalRef,
    string ProcessorId,
    DateTimeOffset SucceededAt);
