using System.Text.Json.Serialization;

namespace Dodostays.Api.Contracts.Listings;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ListingVibe
{
    Mixed = 0,
    Wave = 1,
    Mountain = 2,
    Leaf = 3,
    Town = 4
}
