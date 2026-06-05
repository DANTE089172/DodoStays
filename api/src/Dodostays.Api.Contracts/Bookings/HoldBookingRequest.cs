namespace Dodostays.Api.Contracts.Bookings;

public sealed record HoldBookingRequest(
    Guid ListingId,
    DateOnly CheckIn,
    DateOnly CheckOut,
    int NumGuests);
