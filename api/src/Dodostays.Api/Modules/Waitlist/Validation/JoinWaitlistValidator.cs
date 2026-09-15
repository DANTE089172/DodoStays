using FluentValidation;
using Dodostays.Api.Contracts.Waitlist;

namespace Dodostays.Api.Modules.Waitlist.Validation;

public sealed class JoinWaitlistValidator : AbstractValidator<JoinWaitlistRequest>
{
    public JoinWaitlistValidator()
    {
        RuleFor(r => r.Email)
            .NotEmpty()
            .MaximumLength(320)
            .EmailAddress();
        RuleFor(r => r.Audience).IsInEnum();
        RuleFor(r => r.Name).MaximumLength(200);
        RuleFor(r => r.Region).MaximumLength(120);
        RuleFor(r => r.Message).MaximumLength(2000);
        RuleFor(r => r.Locale).MaximumLength(16);
        RuleFor(r => r.Source).MaximumLength(500);
    }
}
