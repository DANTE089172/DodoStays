using System.Text.Json.Serialization;

namespace Dodostays.Api.Contracts.Listings;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum Amenity
{
    Pool = 0,
    BeachAccess = 1,
    AirCon = 2,
    Wifi = 3,
    Kitchen = 4,
    Parking = 5,
    Tv = 6,
    WashingMachine = 7,
    Balcony = 8,
    Garden = 9,
    Bbq = 10,
    Generator = 11
}
