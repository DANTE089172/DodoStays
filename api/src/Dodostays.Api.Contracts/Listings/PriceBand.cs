using System.Text.Json.Serialization;

namespace Dodostays.Api.Contracts.Listings;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum PriceBand
{
    Budget = 0,
    Mid = 1,
    Premium = 2
}
