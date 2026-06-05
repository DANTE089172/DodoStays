namespace Dodostays.Api.Contracts.Payments;

public sealed record PaymentReceiptDto(
    Guid PaymentId,
    Guid BookingId,
    decimal AmountMur,
    PaymentStatus Status,
    string ExternalRef,
    string ProcessorId,
    DateTimeOffset SucceededAt);
