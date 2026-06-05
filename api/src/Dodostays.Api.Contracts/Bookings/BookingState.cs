using System.Text.Json.Serialization;

namespace Dodostays.Api.Contracts.Bookings;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum BookingState
{
    PendingPayment = 0,
    Confirmed = 1,
    CheckedIn = 2,
    Completed = 3,
    Cancelled = 4,
    Disputed = 5
}
