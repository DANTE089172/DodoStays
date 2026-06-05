using Dodostays.Api.Contracts.Payments;
using Dodostays.Api.Modules.Bookings.Domain;

namespace Dodostays.Api.Modules.Payments.Domain;

public class PaymentRecord
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid BookingId { get; set; }

    /// <summary>
    /// Read-only nav for queries; not configured as a relationship to avoid touching
    /// the Bookings module configuration. Query by FK when needed.
    /// </summary>
    public Booking? Booking { get; set; }

    public string ProcessorId { get; set; } = string.Empty;
    public string ExternalRef { get; set; } = string.Empty;
    public decimal AmountMur { get; set; }
    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;
    public DateTimeOffset AttemptedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? SucceededAt { get; set; }
    public string? FailureReason { get; set; }
    public string? RawPayloadJson { get; set; }
}
