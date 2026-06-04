using Dodostays.Api.Contracts.Listings;

namespace Dodostays.Api.Contracts.Search;

public sealed record ParsedFilters(
    string? Region,
    PropertyType? PropertyType,
    int? MinBedrooms,
    int? MinGuests,
    decimal? MaxNightlyMur,
    decimal? MinNightlyMur,
    IReadOnlyList<Amenity> RequiredAmenities,
    DateTimeOffset? CheckIn,
    DateTimeOffset? CheckOut,
    bool VerifiedOnly,
    IReadOnlyList<string> UnknownTokens);
