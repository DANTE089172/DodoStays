using Xunit;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Dodostays.Api.Modules.Payments.Sms;

namespace Dodostays.Api.Tests.Payments;

public class TwilioSmsSenderTests
{
    [Fact]
    public void Constructor_Throws_WhenTwilioConfigIncomplete()
    {
        // Arrange
        var options = Options.Create(new SmsOptions { TwilioAccountSid = "" });

        // Act
        var act = () => new TwilioSmsSender(options, NullLogger<TwilioSmsSender>.Instance);

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*Sms:TwilioAccountSid is required*");
    }
}
