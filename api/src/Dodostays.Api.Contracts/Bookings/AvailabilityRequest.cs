namespace Dodostays.Api.Contracts.Bookings;

public sealed record AvailabilityRequest(
    DateOnly From,
    DateOnly To);
