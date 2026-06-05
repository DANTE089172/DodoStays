using Microsoft.AspNetCore.Mvc;
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Modules.Bookings.Services;

namespace Dodostays.Api.Modules.Bookings.Endpoints;

internal static class GetCalendarEndpoint
{
    public static RouteHandlerBuilder MapGetCalendar(this IEndpointRouteBuilder app) =>
        app.MapGet("/api/listings/{id:guid}/calendar", HandleAsync).RequireAuthorization();

    private static async Task<IResult> HandleAsync(
        Guid id,
        [FromQuery] int year,
        [FromQuery] int month,
        IUserContext userContext,
        CalendarService service,
        CancellationToken ct)
    {
        var user = await userContext.RequireUserAsync(ct);
        try
        {
            var dto = await service.GetMonthAsync(id, user.Id, year, month, ct);
            return Results.Ok(dto);
        }
        catch (KeyNotFoundException) { return Results.NotFound(); }
        catch (UnauthorizedAccessException) { return Results.Forbid(); }
    }
}
