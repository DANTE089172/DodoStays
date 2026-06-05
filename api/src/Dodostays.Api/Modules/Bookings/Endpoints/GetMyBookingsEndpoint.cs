using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Modules.Bookings.Services;

namespace Dodostays.Api.Modules.Bookings.Endpoints;

internal static class GetMyBookingsEndpoint
{
    public static RouteHandlerBuilder MapGetMyBookings(this IEndpointRouteBuilder app) =>
        app.MapGet("/api/bookings/mine", HandleAsync).RequireAuthorization();

    private static async Task<IResult> HandleAsync(
        IUserContext userContext,
        BookingService service,
        CancellationToken ct)
    {
        var user = await userContext.RequireUserAsync(ct);
        var items = await service.GetMineAsync(user.Id, ct);
        return Results.Ok(items);
    }
}
