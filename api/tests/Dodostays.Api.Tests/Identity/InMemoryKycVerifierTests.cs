using Xunit;
using FluentAssertions;
using Dodostays.Api.Modules.Identity.Kyc;
using Dodostays.Api.Contracts.Identity;

namespace Dodostays.Api.Tests.Identity;

public class InMemoryKycVerifierTests
{
    [Fact]
    public async Task StartAsync_returns_verified_for_normal_user()
    {
        var verifier = new InMemoryKycVerifier();

        var result = await verifier.StartAsync(
            userId: Guid.NewGuid(),
            email: "real@guest.com",
            displayName: "Real Guest",
            CancellationToken.None);

        result.Status.Should().Be(KycStatus.Verified);
        result.VerifierId.Should().Be("in-memory");
        result.ExternalReference.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task StartAsync_returns_failed_for_blocked_email()
    {
        var verifier = new InMemoryKycVerifier();

        var result = await verifier.StartAsync(
            userId: Guid.NewGuid(),
            email: "fail-kyc@test.dodostays.local",
            displayName: "Blocked User",
            CancellationToken.None);

        result.Status.Should().Be(KycStatus.Failed);
        result.FailureReason.Should().NotBeNullOrEmpty();
    }
}
