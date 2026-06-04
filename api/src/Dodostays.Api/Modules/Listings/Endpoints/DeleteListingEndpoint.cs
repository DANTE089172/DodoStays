using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Modules.Listings.Services;

namespace Dodostays.Api.Modules.Listings.Endpoints;

internal static class DeleteListingEndpoint
{
    public static RouteHandlerBuilder MapDeleteListing(this IEndpointRouteBuilder app)
    {
        return app.MapDelete("/api/listings/{id:guid}", HandleAsync).RequireAuthorization();
    }

    private static async Task<IResult> HandleAsync(
        Guid id,
        IUserContext userContext,
        ListingService service,
        CancellationToken ct)
    {
        var user = await userContext.RequireUserAsync(ct);
        try
        {
            await service.DeleteAsync(user.Id, id, ct);
            return Results.NoContent();
        }
        catch (KeyNotFoundException)
        {
            return Results.NotFound();
        }
        catch (UnauthorizedAccessException)
        {
            return Results.Forbid();
        }
    }
}
