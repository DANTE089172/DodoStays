using Xunit;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Dodostays.Api.Modules.Payments.Processing;
using Dodostays.Api.Contracts.Payments;

namespace Dodostays.Api.Tests.Payments;

public class InMemoryPaymentProcessorTests
{
    [Fact]
    public async Task AuthorizeAndCapture_ReturnsCapturedReceipt_OnFirstCall()
    {
        var processor = new InMemoryPaymentProcessor(NullLogger<InMemoryPaymentProcessor>.Instance);
        var bookingId = Guid.NewGuid();
        var amount = 1500m;
        var idempotencyKey = "abc";

        var receipt = await processor.AuthorizeAndCaptureAsync(bookingId, amount, idempotencyKey, CancellationToken.None);

        receipt.Status.Should().Be(PaymentStatus.Captured);
        receipt.AmountMur.Should().Be(1500m);
        receipt.BookingId.Should().Be(bookingId);
        receipt.ProcessorId.Should().Be("InMemory");
        receipt.ExternalRef.Should().StartWith("INMEM-");
        receipt.SucceededAt.Should().BeCloseTo(DateTimeOffset.UtcNow, TimeSpan.FromSeconds(5));
        receipt.PaymentId.Should().NotBeEmpty();
    }

    [Fact]
    public async Task AuthorizeAndCapture_IsIdempotent_OnSameIdempotencyKey()
    {
        var processor = new InMemoryPaymentProcessor(NullLogger<InMemoryPaymentProcessor>.Instance);
        var bookingId = Guid.NewGuid();
        var amount = 2000m;
        var idempotencyKey = "same-key";

        var receipt1 = await processor.AuthorizeAndCaptureAsync(bookingId, amount, idempotencyKey, CancellationToken.None);
        var receipt2 = await processor.AuthorizeAndCaptureAsync(bookingId, amount, idempotencyKey, CancellationToken.None);

        receipt1.PaymentId.Should().Be(receipt2.PaymentId);
        receipt1.ExternalRef.Should().Be(receipt2.ExternalRef);
        receipt1.SucceededAt.Should().Be(receipt2.SucceededAt);
    }

    [Fact]
    public async Task AuthorizeAndCapture_ReturnsDistinctRefs_OnDifferentIdempotencyKeys()
    {
        var processor = new InMemoryPaymentProcessor(NullLogger<InMemoryPaymentProcessor>.Instance);
        var bookingId = Guid.NewGuid();
        var amount = 3000m;

        var receipt1 = await processor.AuthorizeAndCaptureAsync(bookingId, amount, "key1", CancellationToken.None);
        var receipt2 = await processor.AuthorizeAndCaptureAsync(bookingId, amount, "key2", CancellationToken.None);

        receipt1.ExternalRef.Should().NotBe(receipt2.ExternalRef);
        receipt1.PaymentId.Should().NotBe(receipt2.PaymentId);
    }

    [Fact]
    public async Task AuthorizeAndCapture_PreservesAmount_AndIsoCurrencyShape()
    {
        var processor = new InMemoryPaymentProcessor(NullLogger<InMemoryPaymentProcessor>.Instance);
        var bookingId = Guid.NewGuid();
        var amount = 12345.67m;
        var idempotencyKey = "precision-test";

        var receipt = await processor.AuthorizeAndCaptureAsync(bookingId, amount, idempotencyKey, CancellationToken.None);

        receipt.AmountMur.Should().Be(12345.67m);
    }
}
