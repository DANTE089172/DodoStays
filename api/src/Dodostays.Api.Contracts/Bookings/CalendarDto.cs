namespace Dodostays.Api.Contracts.Bookings;

public sealed record CalendarDto(
    Guid ListingId,
    int Year,
    int Month,
    IReadOnlyList<CalendarDayDto> Days);

public sealed record CalendarDayDto(
    DateOnly Date,
    CalendarDayStatus Status,
    Guid? BookingId,
    string? ExternalSource);
