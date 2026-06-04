namespace Dodostays.Api.Contracts.Search;

public sealed record SearchParseRequest(string Text, ParsedFilters? CurrentFilters = null);
