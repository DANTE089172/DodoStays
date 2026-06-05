using Microsoft.AspNetCore.Mvc;
using Dodostays.Api.Contracts.Bookings;
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Modules.Bookings.Services;

namespace Dodostays.Api.Modules.Bookings.Endpoints;

internal static class CancelBookingEndpoint
{
    public static RouteHandlerBuilder MapCancelBooking(this IEndpointRouteBuilder app) =>
        app.MapPost("/api/bookings/{id:guid}/cancel", HandleAsync).RequireAuthorization();

    private static async Task<IResult> HandleAsync(
        Guid id,
        [FromBody] CancelBookingRequest request,
        IUserContext userContext,
        BookingService service,
        CancellationToken ct)
    {
        var user = await userContext.RequireUserAsync(ct);
        try
        {
            var dto = await service.CancelAsync(user.Id, id, request.Reason, ct);
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
