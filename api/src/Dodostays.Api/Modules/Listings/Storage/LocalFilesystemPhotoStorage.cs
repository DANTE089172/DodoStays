using Microsoft.Extensions.Options;

namespace Dodostays.Api.Modules.Listings.Storage;

public sealed class LocalFilesystemPhotoStorage : IPhotoStorage
{
    private readonly PhotoStorageOptions _options;

    public LocalFilesystemPhotoStorage(IOptions<PhotoStorageOptions> options)
    {
        _options = options.Value;
        if (string.IsNullOrWhiteSpace(_options.LocalRoot))
            throw new InvalidOperationException("PhotoStorage:LocalRoot must be configured for Local provider.");
        if (string.IsNullOrWhiteSpace(_options.PublicBaseUrl))
            throw new InvalidOperationException("PhotoStorage:PublicBaseUrl must be configured.");
        Directory.CreateDirectory(_options.LocalRoot);
    }

    public async Task<PhotoStorageResult> SaveAsync(
        Guid listingId,
        string originalFileName,
        string contentType,
        Stream content,
        CancellationToken ct)
    {
        var ext = Path.GetExtension(originalFileName);
        if (string.IsNullOrEmpty(ext)) ext = ContentTypeToExtension(contentType);
        var fileName = $"{Guid.NewGuid():N}{ext.ToLowerInvariant()}";
        var relative = $"{listingId}/{fileName}";
        var fullPath = Path.Combine(_options.LocalRoot, listingId.ToString(), fileName);
        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);

        await using var fs = File.Create(fullPath);
        await content.CopyToAsync(fs, ct);
        var size = fs.Length;

        return new PhotoStorageResult(relative.Replace('\\', '/'), BuildPublicUrl(relative), size);
    }

    public Task DeleteAsync(string relativePath, CancellationToken ct)
    {
        var fullPath = Path.Combine(_options.LocalRoot, relativePath.Replace('/', Path.DirectorySeparatorChar));
        if (File.Exists(fullPath)) File.Delete(fullPath);
        return Task.CompletedTask;
    }

    public string BuildPublicUrl(string relativePath)
    {
        var trimmed = _options.PublicBaseUrl.TrimEnd('/');
        return $"{trimmed}/{relativePath.TrimStart('/')}";
    }

    private static string ContentTypeToExtension(string contentType) => contentType.ToLowerInvariant() switch
    {
        "image/jpeg" => ".jpg",
        "image/png" => ".png",
        "image/webp" => ".webp",
        "image/heic" => ".heic",
        _ => ".bin"
    };
}
