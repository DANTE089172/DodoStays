using FluentValidation;
using Dodostays.Api.Contracts.Search;

namespace Dodostays.Api.Modules.Search.Validation;

public sealed class SearchParseRequestValidator : AbstractValidator<SearchParseRequest>
{
    public SearchParseRequestValidator()
    {
        RuleFor(r => r.Text).NotEmpty().MaximumLength(500);
    }
}
