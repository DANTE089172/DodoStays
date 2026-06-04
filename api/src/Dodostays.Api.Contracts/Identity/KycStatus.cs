using System.Text.Json.Serialization;

namespace Dodostays.Api.Contracts.Identity;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum KycStatus
{
    NotStarted = 0,
    Pending = 1,
    Verified = 2,
    Failed = 3,
    ManualReview = 4
}
