namespace Dodostays.Api.Contracts.Listings;

public sealed record ListingSearchResponse(
    IReadOnlyList<ListingSummaryDto> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages);
