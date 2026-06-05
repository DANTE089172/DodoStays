using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Modules.Common.Database;

namespace Dodostays.Api.Modules.Bookings.Endpoints;

internal static class RemoveExternalFeedEndpoint
{
    public static RouteHandlerBuilder MapRemoveExternalFeed(this IEndpointRouteBuilder app) =>
        app.MapDelete("/api/listings/{id:guid}/external-calendars/{feedId:guid}", HandleAsync).RequireAuthorization();

    private static async Task<IResult> HandleAsync(
        Guid id,
        Guid feedId,
        IUserContext userContext,
        DodostaysDbContext db,
        CancellationToken ct)
    {
        var user = await userContext.RequireUserAsync(ct);
        var listing = await db.Listings.SingleOrDefaultAsync(l => l.Id == id, ct);
        if (listing is null) return Results.NotFound();
        if (listing.HostUserId != user.Id) return Results.Forbid();

        var feed = await db.ExternalCalendarFeeds.SingleOrDefaultAsync(f => f.Id == feedId && f.ListingId == id, ct);
        if (feed is null) return Results.NotFound();

        var blocks = await db.ExternalCalendarBlocks.Where(b => b.FeedId == feedId).ToListAsync(ct);
        db.ExternalCalendarBlocks.RemoveRange(blocks);
        db.ExternalCalendarFeeds.Remove(feed);
        await db.SaveChangesAsync(ct);

        return Results.NoContent();
    }
}
