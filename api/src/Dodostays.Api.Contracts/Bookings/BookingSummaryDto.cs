namespace Dodostays.Api.Contracts.Bookings;

public sealed record BookingSummaryDto(
    Guid Id,
    Guid ListingId,
    string ListingTitle,
    string? PrimaryPhotoUrl,
    BookingState State,
    DateRange Dates,
    decimal TotalMur,
    DateTimeOffset CreatedAt);
