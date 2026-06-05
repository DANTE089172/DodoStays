namespace Dodostays.Api.Contracts.Payments;

public sealed record BookingPaymentSummaryDto(
    Guid BookingId,
    decimal TotalMur,
    decimal AmountPaidMur,
    PaymentStatus PaymentStatus,
    PayoutStatus PayoutStatus,
    Guid? InvoiceId,
    string? InvoiceNumber);
