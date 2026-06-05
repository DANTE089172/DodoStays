namespace Dodostays.Api.Contracts.Bookings;

public sealed record HoldBookingResponse(
    Guid BookingId,
    BookingState State,
    DateRange Dates,
    int NumGuests,
    decimal NightlyRateMur,
    decimal CleaningFeeMur,
    decimal SubtotalMur,
    decimal VatMur,
    decimal TotalMur,
    DateTimeOffset HoldExpiresAt);
