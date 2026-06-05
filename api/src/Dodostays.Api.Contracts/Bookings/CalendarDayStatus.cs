using System.Text.Json.Serialization;

namespace Dodostays.Api.Contracts.Bookings;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum CalendarDayStatus
{
    Free = 0,
    Held = 1,
    BookedInternal = 2,
    BookedExternal = 3,
    Past = 4
}
