using System.Text.Json.Serialization;

namespace Dodostays.Api.Contracts.Payments;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum InvoiceKind
{
    GuestStay = 0,
    HostCommission = 1,
    CreditNote = 2
}
