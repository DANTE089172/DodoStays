using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Dodostays.Api.Contracts.Bookings;
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Modules.Bookings.Services;

namespace Dodostays.Api.Modules.Bookings.Endpoints;

internal static class HoldBookingEndpoint
{
    public static RouteHandlerBuilder MapHoldBooking(this IEndpointRouteBuilder app) =>
        app.MapPost("/api/bookings/hold", HandleAsync).RequireAuthorization();

    private static async Task<IResult> HandleAsync(
        [FromBody] HoldBookingRequest request,
        IValidator<HoldBookingRequest> validator,
        IUserContext userContext,
        BookingHoldService hold,
        CancellationToken ct)
    {
        var user = await userContext.RequireUserAsync(ct);
        var validation = await validator.ValidateAsync(request, ct);
        if (!validation.IsValid)
            return Results.ValidationProblem(validation.ToDictionary());

        try
        {
            var res = await hold.HoldAsync(user.Id, request, ct);
            return Results.Ok(res);
        }
        catch (KeyNotFoundException)
        {
            return Results.NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return Results.Problem(statusCode: StatusCodes.Status409Conflict, title: ex.Message);
        }
    }
}
