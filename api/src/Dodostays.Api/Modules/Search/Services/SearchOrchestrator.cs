using Dodostays.Api.Contracts.Search;
using Dodostays.Api.Modules.Search.Domain;
using Dodostays.Api.Modules.Search.Parsers;

namespace Dodostays.Api.Modules.Search.Services;

public sealed class SearchOrchestrator
{
    private readonly IListingNlParser _parser;
    private readonly NlParseCache _cache;

    public SearchOrchestrator(IListingNlParser parser, NlParseCache cache)
    {
        _parser = parser;
        _cache = cache;
    }

    public async Task<SearchParseResponse> ParseAsync(string text, ParsedFilters? currentFilters, CancellationToken ct)
    {
        var result = await _cache.GetOrAddAsync(text, currentFilters,
            () => _parser.ParseAsync(text, currentFilters, ct), ct);

        var bboxHint = result.Filters.Region is not null
                        && GeoConstants.RegionCentroids.TryGetValue(result.Filters.Region, out var c)
            ? FormatBbox(c.Lat, c.Lng, padDeg: 0.04)
            : null;

        return new SearchParseResponse(result.Filters, result.Confidence, result.Acknowledgement, bboxHint);
    }

    private static string FormatBbox(double lat, double lng, double padDeg) =>
        string.Format(System.Globalization.CultureInfo.InvariantCulture,
            "{0},{1},{2},{3}", lat - padDeg, lng - padDeg, lat + padDeg, lng + padDeg);
}
