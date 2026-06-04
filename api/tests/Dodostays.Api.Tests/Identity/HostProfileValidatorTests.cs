using Xunit;
using FluentAssertions;
using FluentValidation.TestHelper;
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Modules.Identity.Validation;

namespace Dodostays.Api.Tests.Identity;

public class HostProfileValidatorTests
{
    private readonly HostProfileValidator _v = new();

    [Fact]
    public void Valid_profile_passes()
    {
        var dto = new HostProfileDto(
            UserId: Guid.NewGuid(),
            LegalName: "Mauritius Hosts Ltd",
            TamLicenseNumber: "TAM/2024/12345",
            VatNumber: "VAT12345678",
            BankAccountLast4: "1234",
            BankName: "MCB");
        _v.TestValidate(dto).IsValid.Should().BeTrue();
    }

    [Theory]
    [InlineData("")]
    [InlineData("AB")]
    [InlineData("12345")]
    public void TamLicenseNumber_must_be_at_least_6_chars(string tam)
    {
        var dto = new HostProfileDto(Guid.NewGuid(), "L", tam, null, null, null);
        var result = _v.TestValidate(dto);
        result.ShouldHaveValidationErrorFor(x => x.TamLicenseNumber);
    }

    [Fact]
    public void Empty_legal_name_fails()
    {
        var dto = new HostProfileDto(Guid.NewGuid(), "", "TAM/2024/12345", null, null, null);
        _v.TestValidate(dto).ShouldHaveValidationErrorFor(x => x.LegalName);
    }
}
