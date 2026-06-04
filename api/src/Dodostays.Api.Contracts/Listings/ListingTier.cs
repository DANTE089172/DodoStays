using System.Text.Json.Serialization;

namespace Dodostays.Api.Contracts.Listings;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ListingTier
{
    Standard = 0,
    Verified = 1
}
