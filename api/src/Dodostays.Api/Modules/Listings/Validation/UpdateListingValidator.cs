using FluentValidation;
using Dodostays.Api.Contracts.Listings;

namespace Dodostays.Api.Modules.Listings.Validation;

public sealed class UpdateListingValidator : AbstractValidator<UpdateListingRequest>
{
    public UpdateListingValidator()
    {
        RuleFor(r => r.Title).NotEmpty().MaximumLength(200);
        RuleFor(r => r.Description).NotEmpty().MaximumLength(5000);
        RuleFor(r => r.PropertyType).IsInEnum();
        RuleFor(r => r.Region).NotEmpty().MaximumLength(64);
        RuleFor(r => r.AddressLine).NotEmpty().MaximumLength(500);
        RuleFor(r => r.Latitude).InclusiveBetween(-21.0, -19.5);
        RuleFor(r => r.Longitude).InclusiveBetween(56.5, 58.0);
        RuleFor(r => r.Bedrooms).InclusiveBetween(0, 50);
        RuleFor(r => r.Beds).InclusiveBetween(1, 100);
        RuleFor(r => r.Bathrooms).InclusiveBetween(0, 50);
        RuleFor(r => r.MaxGuests).GreaterThan(0).LessThanOrEqualTo(50);
        RuleFor(r => r.NightlyRateMur).GreaterThan(0m).LessThanOrEqualTo(1_000_000m);
        RuleFor(r => r.CleaningFeeMur).GreaterThanOrEqualTo(0m).LessThanOrEqualTo(1_000_000m);
        RuleFor(r => r.MinStayNights).GreaterThan(0).LessThanOrEqualTo(365);
        RuleFor(r => r.Amenities).NotNull();
        RuleForEach(r => r.Amenities).IsInEnum();
    }
}
