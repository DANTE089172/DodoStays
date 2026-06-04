using Xunit;
using FluentAssertions;
using FluentValidation.TestHelper;
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Modules.Identity.Validation;

namespace Dodostays.Api.Tests.Identity;

public class SignUpValidatorTests
{
    private readonly SignUpValidator _validator = new();

    [Theory]
    [InlineData("", "Aa1!aaaaaa", "Test", "en", false)]
    [InlineData("not-email", "Aa1!aaaaaa", "Test", "en", false)]
    [InlineData("ok@x.com", "short", "Test", "en", false)]
    [InlineData("ok@x.com", "Aa1!aaaaaa", "", "en", false)]
    [InlineData("ok@x.com", "Aa1!aaaaaa", "Test", "xx", false)]
    [InlineData("ok@x.com", "Aa1!aaaaaa", "Test", "en", true)]
    [InlineData("ok@x.com", "Aa1!aaaaaa", "Test", "fr", true)]
    [InlineData("ok@x.com", "Aa1!aaaaaa", "Test", "mfe", true)]
    public void Validates_request_correctly(string email, string password, string display, string lang, bool expected)
    {
        var req = new SignUpRequest(email, password, display, lang, UserRole.Guest);
        var result = _validator.TestValidate(req);
        result.IsValid.Should().Be(expected);
    }
}
