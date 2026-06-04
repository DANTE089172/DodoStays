using FluentValidation;
using Dodostays.Api.Contracts.Identity;

namespace Dodostays.Api.Modules.Identity.Validation;

public sealed class SignUpValidator : AbstractValidator<SignUpRequest>
{
    private static readonly string[] AllowedLanguages = { "en", "fr", "mfe" };

    public SignUpValidator()
    {
        RuleFor(r => r.Email).NotEmpty().EmailAddress().MaximumLength(256);
        RuleFor(r => r.Password)
            .NotEmpty()
            .MinimumLength(10)
            .Matches("[A-Z]").WithMessage("Password must contain an uppercase letter.")
            .Matches("[a-z]").WithMessage("Password must contain a lowercase letter.")
            .Matches("[0-9]").WithMessage("Password must contain a digit.");
        RuleFor(r => r.DisplayName).NotEmpty().MaximumLength(120);
        RuleFor(r => r.PreferredLanguage)
            .NotEmpty()
            .Must(l => AllowedLanguages.Contains(l, StringComparer.OrdinalIgnoreCase))
            .WithMessage($"Preferred language must be one of: {string.Join(", ", AllowedLanguages)}.");
        RuleFor(r => r.IntendedRole).IsInEnum();
    }
}
