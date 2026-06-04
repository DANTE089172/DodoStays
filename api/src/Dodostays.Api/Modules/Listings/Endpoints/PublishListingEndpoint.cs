using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Modules.Listings.Services;

namespace Dodostays.Api.Modules.Listings.Endpoints;

internal static class PublishListingEndpoint
{
    public static RouteHandlerBuilder MapPublishListing(this IEndpointRouteBuilder app)
    {
        return app.MapPost("/api/listings/{id:guid}/publish", HandleAsync).RequireAuthorization();
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
            var dto = await service.PublishAsync(user.Id, id, ct);
            return Results.Ok(dto);
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
