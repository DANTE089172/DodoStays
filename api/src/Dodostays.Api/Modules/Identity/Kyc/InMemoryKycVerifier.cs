using Dodostays.Api.Contracts.Identity;

namespace Dodostays.Api.Modules.Identity.Kyc;

public sealed class InMemoryKycVerifier : IKycVerifier
{
    private const string BlockedEmailMarker = "fail-kyc@";

    public string VerifierId => "in-memory";

    public async Task<KycVerificationResult> StartAsync(Guid userId, string email, string displayName, CancellationToken ct)
    {
        await Task.Delay(50, ct);

        if (email.StartsWith(BlockedEmailMarker, StringComparison.OrdinalIgnoreCase))
        {
            return new KycVerificationResult(
                Status: KycStatus.Failed,
                VerifierId: VerifierId,
                ExternalReference: $"in-memory-{userId:N}",
                EvidenceUrl: null,
                FailureReason: "Blocked test email");
        }

        return new KycVerificationResult(
            Status: KycStatus.Verified,
            VerifierId: VerifierId,
            ExternalReference: $"in-memory-{userId:N}",
            EvidenceUrl: null,
            FailureReason: null);
    }
}
