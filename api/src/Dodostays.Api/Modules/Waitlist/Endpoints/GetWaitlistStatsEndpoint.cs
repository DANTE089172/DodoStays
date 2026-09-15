using Dodostays.Api.Modules.Waitlist.Services;

namespace Dodostays.Api.Modules.Waitlist.Endpoints;

internal static class GetWaitlistStatsEndpoint
{
    public static RouteHandlerBuilder MapGetWaitlistStats(this IEndpointRouteBuilder app)
    {
        return app.MapGet("/api/waitlist/stats", HandleAsync).AllowAnonymous();
    }

    private static async Task<IResult> HandleAsync(
        WaitlistService service,
        CancellationToken ct)
    {
        var stats = await service.GetStatsAsync(ct);
        return Results.Ok(stats);
    }
}
