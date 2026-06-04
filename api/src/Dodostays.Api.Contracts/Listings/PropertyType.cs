using System.Text.Json.Serialization;

namespace Dodostays.Api.Contracts.Listings;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum PropertyType
{
    Villa = 0,
    Apartment = 1,
    Guesthouse = 2
}
