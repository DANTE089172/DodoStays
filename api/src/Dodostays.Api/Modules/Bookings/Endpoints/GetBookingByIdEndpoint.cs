using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Modules.Bookings.Services;

namespace Dodostays.Api.Modules.Bookings.Endpoints;

internal static class GetBookingByIdEndpoint
{
    public static RouteHandlerBuilder MapGetBookingById(this IEndpointRouteBuilder app) =>
        app.MapGet("/api/bookings/{id:guid}", HandleAsync).RequireAuthorization();

    private static async Task<IResult> HandleAsync(
        Guid id,
        IUserContext userContext,
        BookingService service,
        CancellationToken ct)
    {
        var user = await userContext.RequireUserAsync(ct);
        var booking = await service.GetAsync(id, user.Id, ct);

        if (booking is null)
            return Results.NotFound();

        return Results.Ok(booking);
    }
}
