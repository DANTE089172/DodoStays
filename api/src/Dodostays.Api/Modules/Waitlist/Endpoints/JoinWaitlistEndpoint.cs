using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Dodostays.Api.Contracts.Waitlist;
using Dodostays.Api.Modules.Waitlist.Services;

namespace Dodostays.Api.Modules.Waitlist.Endpoints;

internal static class JoinWaitlistEndpoint
{
    public static RouteHandlerBuilder MapJoinWaitlist(this IEndpointRouteBuilder app)
    {
        return app.MapPost("/api/waitlist", HandleAsync).AllowAnonymous();
    }

    private static async Task<IResult> HandleAsync(
        [FromBody] JoinWaitlistRequest request,
        IValidator<JoinWaitlistRequest> validator,
        WaitlistService service,
        CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(request, ct);
        if (!validation.IsValid)
            return Results.ValidationProblem(validation.ToDictionary());

        var dto = await service.JoinAsync(request, ct);
        return Results.Ok(dto);
    }
}
