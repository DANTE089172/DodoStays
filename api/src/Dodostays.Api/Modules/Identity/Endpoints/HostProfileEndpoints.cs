using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Modules.Identity.Services;

namespace Dodostays.Api.Modules.Identity.Endpoints;

internal static class HostProfileEndpoints
{
    public static IEndpointRouteBuilder MapHostProfile(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/identity/host-profile", GetAsync).RequireAuthorization();
        app.MapPut("/api/identity/host-profile", UpsertAsync).RequireAuthorization();
        return app;
    }

    private static async Task<IResult> GetAsync(
        IUserContext userContext,
        HostOnboardingService service,
        CancellationToken ct)
    {
        var user = await userContext.RequireUserAsync(ct);
        var profile = await service.GetAsync(user.Id, ct);
        return profile is null ? Results.NotFound() : Results.Ok(profile);
    }

    private static async Task<IResult> UpsertAsync(
        [FromBody] HostProfileDto dto,
        IUserContext userContext,
        IValidator<HostProfileDto> validator,
        HostOnboardingService service,
        CancellationToken ct)
    {
        var user = await userContext.RequireUserAsync(ct);
        var validation = await validator.ValidateAsync(dto, ct);
        if (!validation.IsValid)
            return Results.ValidationProblem(validation.ToDictionary());

        var saved = await service.UpsertAsync(user.Id, dto with { UserId = user.Id }, ct);
        return Results.Ok(saved);
    }
}
