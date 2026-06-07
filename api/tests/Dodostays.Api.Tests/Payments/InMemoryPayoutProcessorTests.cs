using Xunit;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Dodostays.Api.Modules.Payments.Payouts;
using Dodostays.Api.Contracts.Payments;

namespace Dodostays.Api.Tests.Payments;

public class InMemoryPayoutProcessorTests
{
    [Fact]
    public async Task Send_ReturnsPaidReceipt_OnFirstCall()
    {
        var processor = new InMemoryPayoutProcessor(NullLogger<InMemoryPayoutProcessor>.Instance);
        var hostUserId = Guid.NewGuid();
        var amount = 5000m;
        var idempotencyKey = "payout-abc";

        var receipt = await processor.SendAsync(hostUserId, amount, idempotencyKey, CancellationToken.None);

        receipt.Status.Should().Be(PayoutStatus.Paid);
        receipt.NetAmountMur.Should().Be(5000m);
        receipt.HostUserId.Should().Be(hostUserId);
        receipt.ProcessorId.Should().Be("InMemory");
        receipt.ExternalRef.Should().StartWith("INMEMPAYOUT-");
        receipt.ExternalRef.Length.Should().Be(22);
        receipt.SucceededAt.Should().BeCloseTo(DateTimeOffset.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public async Task Send_IsIdempotent_OnSameKey()
    {
        var processor = new InMemoryPayoutProcessor(NullLogger<InMemoryPayoutProcessor>.Instance);
        var hostUserId = Guid.NewGuid();
        var amount = 8000m;
        var idempotencyKey = "same-key-123";

        var receipt1 = await processor.SendAsync(hostUserId, amount, idempotencyKey, CancellationToken.None);
        var receipt2 = await processor.SendAsync(hostUserId, amount, idempotencyKey, CancellationToken.None);

        receipt1.ExternalRef.Should().Be(receipt2.ExternalRef);
        receipt1.SucceededAt.Should().Be(receipt2.SucceededAt);
        receipt1.HostUserId.Should().Be(receipt2.HostUserId);
        receipt1.NetAmountMur.Should().Be(receipt2.NetAmountMur);
    }

    [Fact]
    public async Task Send_DistinctRefs_OnDifferentKeys()
    {
        var processor = new InMemoryPayoutProcessor(NullLogger<InMemoryPayoutProcessor>.Instance);
        var hostUserId = Guid.NewGuid();
        var amount = 10000m;

        var receipt1 = await processor.SendAsync(hostUserId, amount, "key-1", CancellationToken.None);
        var receipt2 = await processor.SendAsync(hostUserId, amount, "key-2", CancellationToken.None);

        receipt1.ExternalRef.Should().NotBe(receipt2.ExternalRef);
    }
}
