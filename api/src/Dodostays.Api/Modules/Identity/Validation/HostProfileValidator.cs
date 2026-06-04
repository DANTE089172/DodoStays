using FluentValidation;
using Dodostays.Api.Contracts.Identity;

namespace Dodostays.Api.Modules.Identity.Validation;

public sealed class HostProfileValidator : AbstractValidator<HostProfileDto>
{
    public HostProfileValidator()
    {
        RuleFor(x => x.LegalName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.TamLicenseNumber)
            .NotEmpty()
            .MinimumLength(6)
            .MaximumLength(64);
        RuleFor(x => x.VatNumber).MaximumLength(64);
        RuleFor(x => x.BankAccountLast4)
            .Matches("^[0-9]{4}$")
            .When(x => !string.IsNullOrEmpty(x.BankAccountLast4))
            .WithMessage("BankAccountLast4 must be exactly 4 digits.");
        RuleFor(x => x.BankName).MaximumLength(120);
    }
}
