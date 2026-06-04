using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Modules.Listings.Services;

namespace Dodostays.Api.Modules.Listings.Endpoints;

internal static class GetListingEndpoint
{
    public static RouteHandlerBuilder MapGetListing(this IEndpointRouteBuilder app)
    {
        return app.MapGet("/api/listings/{id:guid}", HandleAsync).AllowAnonymous();
    }

    private static async Task<IResult> HandleAsync(
        Guid id,
        IUserContext userContext,
        ListingService service,
        CancellationToken ct)
    {
        var currentUser = await userContext.GetCurrentUserAsync(ct);
        var dto = await service.GetAsync(id, includeUnpublished: false, ct);
        if (dto is null && currentUser is not null)
        {
            dto = await service.GetAsync(id, includeUnpublished: true, ct);
            if (dto is not null && dto.HostUserId != currentUser.Id) dto = null;
        }
        return dto is null ? Results.NotFound() : Results.Ok(dto);
    }
}
