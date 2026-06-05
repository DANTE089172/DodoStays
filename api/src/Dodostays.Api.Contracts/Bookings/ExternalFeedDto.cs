namespace Dodostays.Api.Contracts.Bookings;

public sealed record ExternalFeedDto(
    Guid Id,
    Guid ListingId,
    string Source,
    string Url,
    DateTimeOffset CreatedAt,
    DateTimeOffset? LastSyncedAt,
    string? LastError);
