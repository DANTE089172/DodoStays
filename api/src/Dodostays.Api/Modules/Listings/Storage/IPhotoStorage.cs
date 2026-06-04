namespace Dodostays.Api.Modules.Listings.Storage;

public interface IPhotoStorage
{
    Task<PhotoStorageResult> SaveAsync(
        Guid listingId,
        string originalFileName,
        string contentType,
        Stream content,
        CancellationToken ct);

    Task DeleteAsync(string relativePath, CancellationToken ct);

    string BuildPublicUrl(string relativePath);
}

public sealed record PhotoStorageResult(string RelativePath, string PublicUrl, long SizeBytes);
