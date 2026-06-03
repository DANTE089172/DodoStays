using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Modules.Common.Database;

namespace Dodostays.Api.Modules.Common.Health;

public static class HealthCheckEndpoints
{
    public static IEndpointRouteBuilder MapHealthCheckEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/health/live", () => Results.Ok(new { status = "live" }));

        app.MapGet("/health/ready", async (DodostaysDbContext db, CancellationToken ct) =>
        {
            var canConnect = await db.Database.CanConnectAsync(ct);
            return canConnect
                ? Results.Ok(new { status = "ready", database = "ok" })
                : Results.Json(new { status = "not_ready", database = "unreachable" },
                    statusCode: StatusCodes.Status503ServiceUnavailable);
        });

        return app;
    }
}
