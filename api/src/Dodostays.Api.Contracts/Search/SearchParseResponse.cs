namespace Dodostays.Api.Contracts.Search;

public sealed record SearchParseResponse(
    ParsedFilters Filters,
    double Confidence,
    string Acknowledgement,
    string? BoundingBoxHint);
