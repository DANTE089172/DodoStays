using Dodostays.Api.Contracts.Payments;

namespace Dodostays.Api.Modules.Payments.Domain;

public class HostPayout
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid HostUserId { get; set; }
    public List<Guid> BookingIds { get; set; } = new();
    public decimal TotalGrossMur { get; set; }
    public decimal CommissionMur { get; set; }
    public decimal NetMur { get; set; }
    public PayoutStatus Status { get; set; } = PayoutStatus.Pending;
    public string? ExternalRef { get; set; }
    public string ProcessorId { get; set; } = string.Empty;
    public DateTimeOffset AttemptedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? SucceededAt { get; set; }
    public string? FailureReason { get; set; }
}
