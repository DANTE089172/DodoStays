using FluentValidation;
using Dodostays.Api.Contracts.Bookings;

namespace Dodostays.Api.Modules.Bookings.Validation;

public sealed class HoldBookingValidator : AbstractValidator<HoldBookingRequest>
{
    public HoldBookingValidator()
    {
        RuleFor(r => r.ListingId).NotEmpty();
        RuleFor(r => r.NumGuests).GreaterThan(0).LessThanOrEqualTo(50);
        RuleFor(r => r.CheckOut)
            .Must((req, checkOut) => checkOut > req.CheckIn)
            .WithMessage("CheckOut must be after CheckIn.");
        RuleFor(r => r)
            .Must(r => (r.CheckOut.DayNumber - r.CheckIn.DayNumber) <= 365)
            .WithMessage("Stay cannot exceed 365 nights.");
        RuleFor(r => r.CheckIn)
            .GreaterThanOrEqualTo(_ => DateOnly.FromDateTime(DateTime.UtcNow))
            .WithMessage("CheckIn cannot be in the past.");
    }
}
