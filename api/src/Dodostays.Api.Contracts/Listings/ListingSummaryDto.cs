namespace Dodostays.Api.Contracts.Listings;

public sealed record ListingSummaryDto(
    Guid Id,
    string Title,
    PropertyType PropertyType,
    ListingTier Tier,
    string Region,
    int Bedrooms,
    int Beds,
    int MaxGuests,
    decimal NightlyRateMur,
    string? PrimaryPhotoUrl,
    DateTimeOffset CreatedAt);
