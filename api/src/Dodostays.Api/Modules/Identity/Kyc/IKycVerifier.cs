using Dodostays.Api.Contracts.Identity;

namespace Dodostays.Api.Modules.Identity.Kyc;

public interface IKycVerifier
{
    string VerifierId { get; }
    Task<KycVerificationResult> StartAsync(Guid userId, string email, string displayName, CancellationToken ct);
}

public sealed record KycVerificationResult(
    KycStatus Status,
    string VerifierId,
    string? ExternalReference,
    string? EvidenceUrl,
    string? FailureReason);
