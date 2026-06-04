namespace Dodostays.Api.Contracts.Listings;

public sealed record UpdateListingRequest(
    string Title,
    string Description,
    PropertyType PropertyType,
    string Region,
    string AddressLine,
    double Latitude,
    double Longitude,
    int Bedrooms,
    int Beds,
    int Bathrooms,
    int MaxGuests,
    decimal NightlyRateMur,
    decimal CleaningFeeMur,
    int MinStayNights,
    IReadOnlyList<Amenity> Amenities);
