using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Contracts.Bookings;
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Modules.Bookings.Ical;
using Dodostays.Api.Modules.Common.Database;

namespace Dodostays.Api.Modules.Bookings.Endpoints;

internal static class GetMyIcalUrlEndpoint
{
    public static RouteHandlerBuilder MapGetMyIcalUrl(this IEndpointRouteBuilder app) =>
        app.MapGet("/api/listings/{id:guid}/ical-url", HandleAsync).RequireAuthorization();

    private static async Task<IResult> HandleAsync(
        Guid id,
        IUserContext userContext,
        SignedIcalUrlGenerator urlGen,
        DodostaysDbContext db,
        CancellationToken ct)
    {
        var user = await userContext.RequireUserAsync(ct);
        var listing = await db.Listings.SingleOrDefaultAsync(l => l.Id == id, ct);
        if (listing is null) return Results.NotFound();
        if (listing.HostUserId != user.Id) return Results.Forbid();

        return Results.Ok(new HostIcalUrlResponse(urlGen.GenerateUrl(id)));
    }
}
