using System.Text.Json.Serialization;

namespace Dodostays.Api.Contracts.Payments;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum PayoutStatus
{
    NotEligible = 0,
    Eligible = 1,
    Pending = 2,
    Paid = 3,
    Failed = 4
}
