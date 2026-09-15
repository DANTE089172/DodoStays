using Dodostays.Api.Modules.Common.Storage;
using Microsoft.Extensions.Options;
using Minio;
using Minio.DataModel.Args;

namespace Dodostays.Api.Modules.Listings.Storage;

/// <summary>
/// Stores listing photos in Cloudflare R2 (S3-compatible). Photos are served publicly, so the
/// bucket is fronted by a public R2 domain (or Cloudflare CDN) configured as
/// <see cref="PhotoStorageOptions.PublicBaseUrl"/>; <see cref="BuildPublicUrl"/> composes that
/// with the object key.
/// </summary>
public sealed class R2PhotoStorage : IPhotoStorage
{
    private readonly PhotoStorageOptions _options;
    private readonly IMinioClient _client;
    private readonly string _bucket;

    public R2PhotoStorage(IOptions<PhotoStorageOptions> options)
    {
        _options = options.Value;
        if (string.IsNullOrWhiteSpace(_options.R2AccessKeyId)
            || string.IsNullOrWhiteSpace(_options.R2SecretAccessKey)
            || string.IsNullOrWhiteSpace(_options.R2Bucket))
            throw new InvalidOperationException("PhotoStorage R2 settings (R2AccessKeyId/R2SecretAccessKey/R2Bucket) are required for the R2 provider.");
        if (string.IsNullOrWhiteSpace(_options.PublicBaseUrl))
            throw new InvalidOperationException("PhotoStorage:PublicBaseUrl must be configured (the R2 public domain).");

        var endpoint = !string.IsNullOrWhiteSpace(_options.R2Endpoint)
            ? _options.R2Endpoint!
            : !string.IsNullOrWhiteSpace(_options.R2AccountId)
                ? S3CompatibleClientFactory.R2Endpoint(_options.R2AccountId!)
                : throw new InvalidOperationException("PhotoStorage R2 requires either R2Endpoint or R2AccountId.");

        _client = S3CompatibleClientFactory.Create(endpoint, _options.R2AccessKeyId!, _options.R2SecretAccessKey!, _options.R2UseSsl);
        _bucket = _options.R2Bucket!;
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
        var key = $"{listingId}/{Guid.NewGuid():N}{ext.ToLowerInvariant()}";

        // Buffer to get a known length (the source stream may not be seekable) and satisfy R2's
        // requirement for an explicit object size.
        using var buffer = new MemoryStream();
        await content.CopyToAsync(buffer, ct);
        buffer.Position = 0;

        await _client.PutObjectAsync(new PutObjectArgs()
            .WithBucket(_bucket)
            .WithObject(key)
            .WithStreamData(buffer)
            .WithObjectSize(buffer.Length)
            .WithContentType(contentType), ct);

        return new PhotoStorageResult(key, BuildPublicUrl(key), buffer.Length);
    }

    public async Task DeleteAsync(string relativePath, CancellationToken ct)
    {
        await _client.RemoveObjectAsync(new RemoveObjectArgs()
            .WithBucket(_bucket)
            .WithObject(relativePath), ct);
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
