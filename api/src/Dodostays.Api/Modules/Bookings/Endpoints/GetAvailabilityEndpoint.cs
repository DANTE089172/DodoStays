using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Dodostays.Api.Contracts.Bookings;
using Dodostays.Api.Modules.Bookings.Services;

namespace Dodostays.Api.Modules.Bookings.Endpoints;

internal static class GetAvailabilityEndpoint
{
    public static RouteHandlerBuilder MapGetAvailability(this IEndpointRouteBuilder app) =>
        app.MapGet("/api/listings/{id:guid}/availability", HandleAsync).AllowAnonymous();

    private static async Task<IResult> HandleAsync(
        Guid id,
        [FromQuery] DateOnly from,
        [FromQuery] DateOnly to,
        IValidator<AvailabilityRequest> validator,
        AvailabilityService service,
        CancellationToken ct)
    {
        var req = new AvailabilityRequest(from, to);
        var validation = await validator.ValidateAsync(req, ct);
        if (!validation.IsValid)
            return Results.ValidationProblem(validation.ToDictionary());

        var res = await service.CheckAsync(id, new DateRange(from, to), ct);
        return Results.Ok(res);
    }
}
