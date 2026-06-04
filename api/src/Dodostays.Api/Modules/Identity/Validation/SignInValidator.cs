using FluentValidation;
using Dodostays.Api.Contracts.Identity;

namespace Dodostays.Api.Modules.Identity.Validation;

public sealed class SignInValidator : AbstractValidator<SignInRequest>
{
    public SignInValidator()
    {
        RuleFor(r => r.Email).NotEmpty().EmailAddress();
        RuleFor(r => r.Password).NotEmpty();
    }
}
