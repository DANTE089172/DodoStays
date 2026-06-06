using Xunit;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Dodostays.Api.Modules.Payments.Email;

namespace Dodostays.Api.Tests.Payments;

public class ResendEmailSenderTests
{
    [Fact]
    public void Constructor_Throws_WhenResendApiKeyMissing()
    {
        // Arrange
        var options = Options.Create(new EmailOptions { ResendApiKey = "" });

        // Act
        var act = () => new ResendEmailSender(options, NullLogger<ResendEmailSender>.Instance);

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*Email:ResendApiKey is required*");
    }
}
