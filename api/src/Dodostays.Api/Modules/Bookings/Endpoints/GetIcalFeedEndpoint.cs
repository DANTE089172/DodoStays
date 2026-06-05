using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Contracts.Bookings;
using Dodostays.Api.Modules.Bookings.Ical;
using Dodostays.Api.Modules.Common.Database;

namespace Dodostays.Api.Modules.Bookings.Endpoints;

internal static class GetIcalFeedEndpoint
{
    public static RouteHandlerBuilder MapGetIcalFeed(this IEndpointRouteBuilder app) =>
        app.MapGet("/ical/listings/{id:guid}.ics", HandleAsync).AllowAnonymous();

    private static async Task<IResult> HandleAsync(
        Guid id,
        [FromQuery] string? token,
        SignedIcalUrlGenerator urlGen,
        IcalFeedEmitter emitter,
        DodostaysDbContext db,
        CancellationToken ct)
    {
        if (!urlGen.Verify(id, token))
            return Results.Unauthorized();

        var listing = await db.Listings.AsNoTracking()
            .Where(l => l.Id == id)
            .Select(l => new { l.Id, l.Title })
            .SingleOrDefaultAsync(ct);
        if (listing is null) return Results.NotFound();

        var bookings = await db.Bookings.AsNoTracking()
            .Where(b => b.ListingId == id
                && b.State != BookingState.Cancelled
                && b.State != BookingState.PendingPayment)
            .Select(b => new EmittedBooking(b.Id, listing.Title, b.CheckIn, b.CheckOut, b.State))
            .ToListAsync(ct);

        var ics = emitter.Emit($"DodoStays — {listing.Title}", bookings);
        return Results.Text(ics, "text/calendar; charset=utf-8");
    }
}
