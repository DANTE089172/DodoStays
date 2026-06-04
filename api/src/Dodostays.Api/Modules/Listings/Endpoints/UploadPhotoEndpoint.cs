using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Contracts.Listings;
using Dodostays.Api.Modules.Common.Database;
using Dodostays.Api.Modules.Listings.Domain;
using Dodostays.Api.Modules.Listings.Storage;

namespace Dodostays.Api.Modules.Listings.Endpoints;

internal static class UploadPhotoEndpoint
{
    private static readonly HashSet<string> AllowedTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg", "image/png", "image/webp", "image/heic"
    };

    public static RouteHandlerBuilder MapUploadPhoto(this IEndpointRouteBuilder app)
    {
        return app.MapPost("/api/listings/{id:guid}/photos", HandleAsync)
                  .RequireAuthorization()
                  .DisableAntiforgery();
    }

    private static async Task<IResult> HandleAsync(
        Guid id,
        IFormFile file,
        [FromForm] string? caption,
        IUserContext userContext,
        DodostaysDbContext db,
        IPhotoStorage storage,
        IOptions<PhotoStorageOptions> opts,
        CancellationToken ct)
    {
        var user = await userContext.RequireUserAsync(ct);
        var listing = await db.Listings.SingleOrDefaultAsync(l => l.Id == id, ct);
        if (listing is null) return Results.NotFound();
        if (listing.HostUserId != user.Id) return Results.Forbid();

        if (file.Length == 0) return Results.Problem(statusCode: StatusCodes.Status400BadRequest, title: "Empty file.");
        if (file.Length > opts.Value.MaxFileSizeBytes)
            return Results.Problem(statusCode: StatusCodes.Status413PayloadTooLarge, title: "File too large.");
        if (!AllowedTypes.Contains(file.ContentType ?? string.Empty))
            return Results.Problem(statusCode: StatusCodes.Status415UnsupportedMediaType, title: "Unsupported image type.");

        await using var stream = file.OpenReadStream();
        var stored = await storage.SaveAsync(id, file.FileName, file.ContentType!, stream, ct);

        var maxOrder = await db.ListingPhotos.Where(p => p.ListingId == id).MaxAsync(p => (int?)p.SortOrder, ct) ?? -1;
        var photo = new ListingPhoto
        {
            ListingId = id,
            StoragePath = stored.RelativePath,
            PublicUrl = stored.PublicUrl,
            Caption = caption,
            SortOrder = maxOrder + 1,
            SizeBytes = stored.SizeBytes,
            ContentType = file.ContentType!
        };
        db.ListingPhotos.Add(photo);
        listing.Touch();
        await db.SaveChangesAsync(ct);

        var dto = new ListingPhotoDto(photo.Id, photo.PublicUrl, photo.Caption, photo.SortOrder);
        return Results.Created($"/api/listings/{id}/photos/{photo.Id}", dto);
    }
}
