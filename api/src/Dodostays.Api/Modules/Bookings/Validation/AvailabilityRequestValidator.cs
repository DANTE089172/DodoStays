using FluentValidation;
using Dodostays.Api.Contracts.Bookings;

namespace Dodostays.Api.Modules.Bookings.Validation;

public sealed class AvailabilityRequestValidator : AbstractValidator<AvailabilityRequest>
{
    public AvailabilityRequestValidator()
    {
        RuleFor(r => r.To)
            .Must((req, to) => to > req.From)
            .WithMessage("To must be after From.");
        RuleFor(r => r)
            .Must(r => (r.To.DayNumber - r.From.DayNumber) <= 365)
            .WithMessage("Range cannot exceed 365 days.");
    }
}
