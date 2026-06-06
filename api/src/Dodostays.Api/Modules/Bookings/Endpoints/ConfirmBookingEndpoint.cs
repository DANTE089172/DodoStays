using Microsoft.AspNetCore.Mvc;
using Dodostays.Api.Contracts.Bookings;
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Modules.Bookings.Services;

namespace Dodostays.Api.Modules.Bookings.Endpoints;

internal static class ConfirmBookingEndpoint
{
    public static RouteHandlerBuilder MapConfirmBooking(this IEndpointRouteBuilder app) =>
        app.MapPost("/api/bookings/confirm", HandleAsync).RequireAuthorization();

    private static async Task<IResult> HandleAsync(
        [FromBody] ConfirmBookingRequest request,
        HttpContext httpContext,
        IUserContext userContext,
        BookingService service,
        CancellationToken ct)
    {
        var user = await userContext.RequireUserAsync(ct);
        var idempotencyKey = httpContext.Request.Headers["Idempotency-Key"].FirstOrDefault() ?? request.IdempotencyKey;
        try
        {
            var dto = await service.ConfirmAsync(user.Id, request.BookingId, request.PaymentReference, idempotencyKey, ct);
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
