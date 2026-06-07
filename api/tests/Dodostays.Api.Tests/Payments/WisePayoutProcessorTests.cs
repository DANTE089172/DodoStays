using Xunit;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Dodostays.Api.Modules.Payments.Payouts;

namespace Dodostays.Api.Tests.Payments;

public class WisePayoutProcessorTests
{
    [Fact]
    public void Constructor_Throws_WhenWiseConfigIncomplete()
    {
        var options = Options.Create(new PayoutOptions
        {
            Provider = "Wise",
            WiseApiKey = "",  // Empty API key
            WiseProfileId = "profile-123"
        });

        var act = () => new WisePayoutProcessor(options, NullLogger<WisePayoutProcessor>.Instance);

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*WiseApiKey*");
    }

    [Fact]
    public void Constructor_Throws_WhenWiseProfileIdMissing()
    {
        var options = Options.Create(new PayoutOptions
        {
            Provider = "Wise",
            WiseApiKey = "test-key",
            WiseProfileId = ""  // Empty profile ID
        });

        var act = () => new WisePayoutProcessor(options, NullLogger<WisePayoutProcessor>.Instance);

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*WiseProfileId*");
    }
}
