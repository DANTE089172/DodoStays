using FluentValidation;
using Dodostays.Api.Contracts.Bookings;

namespace Dodostays.Api.Modules.Bookings.Validation;

public sealed class AddExternalFeedValidator : AbstractValidator<AddExternalFeedRequest>
{
    private static readonly string[] AllowedSources = { "Airbnb", "Booking.com", "Vrbo", "Other" };

    public AddExternalFeedValidator()
    {
        RuleFor(r => r.Source)
            .NotEmpty()
            .Must(s => AllowedSources.Contains(s))
            .WithMessage($"Source must be one of: {string.Join(", ", AllowedSources)}.");
        RuleFor(r => r.Url)
            .NotEmpty()
            .MaximumLength(2048)
            .Must(u => Uri.TryCreate(u, UriKind.Absolute, out var uri)
                && (uri.Scheme == Uri.UriSchemeHttps || uri.Scheme == Uri.UriSchemeHttp))
            .WithMessage("URL must be a valid HTTP(S) URL.");
    }
}
