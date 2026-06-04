using System.Text.Json.Serialization;

namespace Dodostays.Api.Contracts.Listings;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ListingStatus
{
    Draft = 0,
    Published = 1,
    Suspended = 2,
    Archived = 3
}
