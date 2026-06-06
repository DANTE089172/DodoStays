using Dodostays.Api.Contracts.Payments;

namespace Dodostays.Api.Modules.Payments.Processing;

public interface IPaymentProcessor
{
    string ProcessorId { get; }
    Task<PaymentReceiptDto> AuthorizeAndCaptureAsync(
        Guid bookingId,
        decimal amountMur,
        string idempotencyKey,
        CancellationToken ct);
}
