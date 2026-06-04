using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Modules.Common.Database;
using Dodostays.Api.Modules.Listings.Storage;

namespace Dodostays.Api.Modules.Listings.Endpoints;

internal static class DeletePhotoEndpoint
{
    public static RouteHandlerBuilder MapDeletePhoto(this IEndpointRouteBuilder app)
    {
        return app.MapDelete("/api/listings/{id:guid}/photos/{photoId:guid}", HandleAsync).RequireAuthorization();
    }

    private static async Task<IResult> HandleAsync(
        Guid id,
        Guid photoId,
        IUserContext userContext,
        DodostaysDbContext db,
        IPhotoStorage storage,
        CancellationToken ct)
    {
        var user = await userContext.RequireUserAsync(ct);
        var listing = await db.Listings.SingleOrDefaultAsync(l => l.Id == id, ct);
        if (listing is null) return Results.NotFound();
        if (listing.HostUserId != user.Id) return Results.Forbid();

        var photo = await db.ListingPhotos.SingleOrDefaultAsync(p => p.Id == photoId && p.ListingId == id, ct);
        if (photo is null) return Results.NotFound();

        await storage.DeleteAsync(photo.StoragePath, ct);
        db.ListingPhotos.Remove(photo);
        listing.Touch();
        await db.SaveChangesAsync(ct);

        return Results.NoContent();
    }
}
