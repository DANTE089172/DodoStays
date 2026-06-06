namespace Dodostays.Api.Contracts.Bookings;

public sealed record ConfirmBookingRequest(
    Guid BookingId,
    string? PaymentReference = null,
    string? IdempotencyKey = null);
