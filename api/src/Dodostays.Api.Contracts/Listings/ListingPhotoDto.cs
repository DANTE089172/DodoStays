namespace Dodostays.Api.Contracts.Listings;

public sealed record ListingPhotoDto(
    Guid Id,
    string PublicUrl,
    string? Caption,
    int SortOrder);
