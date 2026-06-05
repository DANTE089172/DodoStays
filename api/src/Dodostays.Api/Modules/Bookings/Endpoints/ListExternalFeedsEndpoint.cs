using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Contracts.Bookings;
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Modules.Common.Database;

namespace Dodostays.Api.Modules.Bookings.Endpoints;

internal static class ListExternalFeedsEndpoint
{
    public static RouteHandlerBuilder MapListExternalFeeds(this IEndpointRouteBuilder app) =>
        app.MapGet("/api/listings/{id:guid}/external-calendars", HandleAsync).RequireAuthorization();

    private static async Task<IResult> HandleAsync(
        Guid id,
        IUserContext userContext,
        DodostaysDbContext db,
        CancellationToken ct)
    {
        var user = await userContext.RequireUserAsync(ct);
        var listing = await db.Listings.SingleOrDefaultAsync(l => l.Id == id, ct);
        if (listing is null) return Results.NotFound();
        if (listing.HostUserId != user.Id) return Results.Forbid();

        var feeds = await db.ExternalCalendarFeeds.AsNoTracking()
            .Where(f => f.ListingId == id)
            .OrderByDescending(f => f.CreatedAt)
            .Select(f => new ExternalFeedDto(f.Id, f.ListingId, f.Source, f.Url, f.CreatedAt, f.LastSyncedAt, f.LastError))
            .ToListAsync(ct);

        return Results.Ok(feeds);
    }
}
