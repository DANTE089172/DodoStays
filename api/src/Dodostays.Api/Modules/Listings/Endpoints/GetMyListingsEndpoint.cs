using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Modules.Listings.Services;

namespace Dodostays.Api.Modules.Listings.Endpoints;

internal static class GetMyListingsEndpoint
{
    public static RouteHandlerBuilder MapGetMyListings(this IEndpointRouteBuilder app)
    {
        return app.MapGet("/api/listings/mine", HandleAsync).RequireAuthorization();
    }

    private static async Task<IResult> HandleAsync(
        IUserContext userContext,
        ListingService service,
        CancellationToken ct)
    {
        var user = await userContext.RequireUserAsync(ct);
        var items = await service.GetMineAsync(user.Id, ct);
        return Results.Ok(items);
    }
}
