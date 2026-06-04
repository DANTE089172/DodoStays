using Dodostays.Api.Contracts.Identity;

namespace Dodostays.Api.Modules.Identity.Endpoints;

internal static class MeEndpoint
{
    public static RouteHandlerBuilder MapMe(this IEndpointRouteBuilder app)
    {
        return app.MapGet("/api/identity/me", HandleAsync).RequireAuthorization();
    }

    private static async Task<IResult> HandleAsync(
        IUserContext userContext,
        CancellationToken ct)
    {
        var user = await userContext.GetCurrentUserAsync(ct);
        return user is null ? Results.Unauthorized() : Results.Ok(user);
    }
}
