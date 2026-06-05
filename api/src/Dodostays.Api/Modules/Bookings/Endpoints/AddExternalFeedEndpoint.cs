using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Contracts.Bookings;
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Modules.Bookings.Domain;
using Dodostays.Api.Modules.Common.Database;

namespace Dodostays.Api.Modules.Bookings.Endpoints;

internal static class AddExternalFeedEndpoint
{
    public static RouteHandlerBuilder MapAddExternalFeed(this IEndpointRouteBuilder app) =>
        app.MapPost("/api/listings/{id:guid}/external-calendars", HandleAsync).RequireAuthorization();

    private static async Task<IResult> HandleAsync(
        Guid id,
        [FromBody] AddExternalFeedRequest request,
        IValidator<AddExternalFeedRequest> validator,
        IUserContext userContext,
        DodostaysDbContext db,
        CancellationToken ct)
    {
        var user = await userContext.RequireUserAsync(ct);
        var validation = await validator.ValidateAsync(request, ct);
        if (!validation.IsValid) return Results.ValidationProblem(validation.ToDictionary());

        var listing = await db.Listings.SingleOrDefaultAsync(l => l.Id == id, ct);
        if (listing is null) return Results.NotFound();
        if (listing.HostUserId != user.Id) return Results.Forbid();

        var feed = new ExternalCalendarFeed
        {
            ListingId = id,
            Source = request.Source,
            Url = request.Url,
        };
        db.ExternalCalendarFeeds.Add(feed);
        await db.SaveChangesAsync(ct);

        return Results.Created($"/api/listings/{id}/external-calendars/{feed.Id}",
            new ExternalFeedDto(feed.Id, feed.ListingId, feed.Source, feed.Url, feed.CreatedAt, feed.LastSyncedAt, feed.LastError));
    }
}
