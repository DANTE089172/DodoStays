using Dodostays.Api.Contracts.Search;

namespace Dodostays.Api.Contracts.Listings;

public sealed record ListingSearchRequest(
    string? Region = null,
    PropertyType? PropertyType = null,
    int? MinBedrooms = null,
    int? MinGuests = null,
    decimal? MaxNightlyMur = null,
    decimal? MinNightlyMur = null,
    IReadOnlyList<Amenity>? RequiredAmenities = null,
    bool VerifiedOnly = false,
    string Sort = "newest",
    int Page = 1,
    int PageSize = 20,
    BoundingBox? BoundingBox = null,
    IReadOnlyList<Anchor>? Anchors = null);
