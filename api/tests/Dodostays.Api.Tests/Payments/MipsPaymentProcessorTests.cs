using Xunit;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Dodostays.Api.Modules.Payments.Processing;

namespace Dodostays.Api.Tests.Payments;

public class MipsPaymentProcessorTests
{
    [Fact]
    public void Constructor_Throws_WhenMipsConfigIncomplete()
    {
        var options = Options.Create(new PaymentOptions
        {
            Provider = "Mips",
            MipsApiKey = "",  // Empty — should fail
            MipsBaseUrl = "https://mips.test",
            MipsMerchantId = "TEST123"
        });
        var http = new HttpClient();
        var logger = NullLogger<MipsPaymentProcessor>.Instance;

        Action act = () => new MipsPaymentProcessor(http, options, logger);

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*MipsApiKey*");
    }

    [Fact]
    public void Constructor_Throws_WhenMipsBaseUrlMissing()
    {
        var options = Options.Create(new PaymentOptions
        {
            Provider = "Mips",
            MipsApiKey = "test-key",
            MipsBaseUrl = "",  // Empty — should fail
            MipsMerchantId = "TEST123"
        });
        var http = new HttpClient();
        var logger = NullLogger<MipsPaymentProcessor>.Instance;

        Action act = () => new MipsPaymentProcessor(http, options, logger);

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*MipsBaseUrl*");
    }

    [Fact]
    public void Constructor_Throws_WhenMipsMerchantIdMissing()
    {
        var options = Options.Create(new PaymentOptions
        {
            Provider = "Mips",
            MipsApiKey = "test-key",
            MipsBaseUrl = "https://mips.test",
            MipsMerchantId = ""  // Empty — should fail
        });
        var http = new HttpClient();
        var logger = NullLogger<MipsPaymentProcessor>.Instance;

        Action act = () => new MipsPaymentProcessor(http, options, logger);

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*MipsMerchantId*");
    }
}
