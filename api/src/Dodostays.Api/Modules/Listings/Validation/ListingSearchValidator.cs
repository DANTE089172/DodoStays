using FluentValidation;
using Dodostays.Api.Contracts.Listings;

namespace Dodostays.Api.Modules.Listings.Validation;

public sealed class ListingSearchValidator : AbstractValidator<ListingSearchRequest>
{
    public ListingSearchValidator()
    {
        RuleFor(r => r.Page).GreaterThan(0);
        RuleFor(r => r.PageSize).InclusiveBetween(1, 50);
        RuleFor(r => r.MinBedrooms!.Value).GreaterThanOrEqualTo(0).When(r => r.MinBedrooms.HasValue);
        RuleFor(r => r.MinGuests!.Value).GreaterThan(0).When(r => r.MinGuests.HasValue);
        RuleFor(r => r.MaxNightlyMur!.Value).GreaterThan(0m).When(r => r.MaxNightlyMur.HasValue);
        RuleFor(r => r.MinNightlyMur!.Value).GreaterThanOrEqualTo(0m).When(r => r.MinNightlyMur.HasValue);
        RuleFor(r => r.Sort).Must(s => s is "newest" or "price-asc" or "price-desc").WithMessage("Sort must be one of: newest, price-asc, price-desc.");
        RuleFor(r => r.Region).MaximumLength(64);
    }
}
