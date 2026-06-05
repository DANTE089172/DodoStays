using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Modules.Bookings.Services;

namespace Dodostays.Api.Modules.Bookings.Endpoints;

internal static class GetListingBookingsEndpoint
{
    public static RouteHandlerBuilder MapGetListingBookings(this IEndpointRouteBuilder app) =>
        app.MapGet("/api/listings/{id:guid}/bookings", HandleAsync).RequireAuthorization();

    private static async Task<IResult> HandleAsync(
        Guid id,
        IUserContext userContext,
        BookingService service,
        CancellationToken ct)
    {
        var user = await userContext.RequireUserAsync(ct);
        try
        {
            var items = await service.GetForListingAsync(id, user.Id, ct);
            return Results.Ok(items);
        }
        catch (KeyNotFoundException) { return Results.NotFound(); }
        catch (UnauthorizedAccessException) { return Results.Forbid(); }
    }
}
