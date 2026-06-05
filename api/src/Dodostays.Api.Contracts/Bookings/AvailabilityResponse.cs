namespace Dodostays.Api.Contracts.Bookings;

public sealed record AvailabilityResponse(
    Guid ListingId,
    DateOnly From,
    DateOnly To,
    bool IsAvailable,
    IReadOnlyList<DateRange> ConflictingRanges);
