using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Dodostays.Api.Contracts.Listings;
using Dodostays.Api.Modules.Listings.Services;

namespace Dodostays.Api.Modules.Listings.Endpoints;

internal static class SearchListingsEndpoint
{
    public static RouteHandlerBuilder MapSearchListings(this IEndpointRouteBuilder app)
    {
        return app.MapGet("/api/listings", HandleAsync).AllowAnonymous();
    }

    private static async Task<IResult> HandleAsync(
        [AsParameters] ListingSearchQueryParameters query,
        IValidator<ListingSearchRequest> validator,
        ListingSearchService service,
        CancellationToken ct)
    {
        var amenities = ParseAmenities(query.Amenities);
        var request = new ListingSearchRequest(
            Region: query.Region,
            PropertyType: query.PropertyType,
            MinBedrooms: query.MinBedrooms,
            MinGuests: query.MinGuests,
            MaxNightlyMur: query.MaxNightlyMur,
            MinNightlyMur: query.MinNightlyMur,
            RequiredAmenities: amenities,
            VerifiedOnly: query.VerifiedOnly ?? false,
            Sort: query.Sort ?? "newest",
            Page: query.Page ?? 1,
            PageSize: query.PageSize ?? 20);

        var validation = await validator.ValidateAsync(request, ct);
        if (!validation.IsValid)
            return Results.ValidationProblem(validation.ToDictionary());

        var result = await service.SearchAsync(request, ct);
        return Results.Ok(result);
    }

    private static IReadOnlyList<Amenity>? ParseAmenities(string? csv)
    {
        if (string.IsNullOrWhiteSpace(csv)) return null;
        var parsed = new List<Amenity>();
        foreach (var token in csv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            if (Enum.TryParse<Amenity>(token, ignoreCase: true, out var a)) parsed.Add(a);
        }
        return parsed.Count == 0 ? null : parsed;
    }

    public sealed record ListingSearchQueryParameters(
        string? Region,
        PropertyType? PropertyType,
        int? MinBedrooms,
        int? MinGuests,
        decimal? MaxNightlyMur,
        decimal? MinNightlyMur,
        string? Amenities,
        bool? VerifiedOnly,
        string? Sort,
        int? Page,
        int? PageSize);
}
