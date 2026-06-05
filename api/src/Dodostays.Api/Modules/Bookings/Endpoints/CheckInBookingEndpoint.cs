using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Modules.Bookings.Services;

namespace Dodostays.Api.Modules.Bookings.Endpoints;

internal static class CheckInBookingEndpoint
{
    public static RouteHandlerBuilder MapCheckInBooking(this IEndpointRouteBuilder app) =>
        app.MapPost("/api/bookings/{id:guid}/checkin", HandleAsync).RequireAuthorization();

    private static async Task<IResult> HandleAsync(
        Guid id,
        IUserContext userContext,
        BookingService service,
        CancellationToken ct)
    {
        var user = await userContext.RequireUserAsync(ct);
        try
        {
            var dto = await service.CheckInAsync(user.Id, id, ct);
            return Results.Ok(dto);
        }
        catch (KeyNotFoundException) { return Results.NotFound(); }
        catch (UnauthorizedAccessException) { return Results.Forbid(); }
        catch (InvalidOperationException ex)
        {
            return Results.Problem(statusCode: StatusCodes.Status409Conflict, title: ex.Message);
        }
    }
}
