using Dodostays.Api.Contracts.Identity;

namespace Dodostays.Api.Modules.Identity.Domain;

public class KycRecord
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public DodostaysUser User { get; set; } = null!;
    public KycStatus Status { get; set; } = KycStatus.NotStarted;
    public string VerifierId { get; set; } = string.Empty;
    public string? ExternalReference { get; set; }
    public string? EvidenceUrl { get; set; }
    public string? FailureReason { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
