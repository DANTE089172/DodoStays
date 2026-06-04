using System.Text.Json.Serialization;

namespace Dodostays.Api.Contracts.Identity;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum UserRole
{
    Guest = 0,
    Host = 1,
    Admin = 2,
    Inspector = 3
}
