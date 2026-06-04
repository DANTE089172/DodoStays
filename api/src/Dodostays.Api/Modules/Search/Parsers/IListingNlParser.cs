using Dodostays.Api.Contracts.Search;

namespace Dodostays.Api.Modules.Search.Parsers;

public interface IListingNlParser
{
    Task<NlParseResult> ParseAsync(string text, ParsedFilters? currentFilters, CancellationToken ct);
}

public readonly record struct NlParseResult(ParsedFilters Filters, double Confidence, string Acknowledgement);
