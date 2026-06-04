using Microsoft.Extensions.Options;

namespace Dodostays.Api.Modules.Listings.Storage;

public sealed class R2PhotoStorage : IPhotoStorage
{
    private readonly PhotoStorageOptions _options;

    public R2PhotoStorage(IOptions<PhotoStorageOptions> options)
    {
        _options = options.Value;
        if (string.IsNullOrWhiteSpace(_options.R2AccountId)
            || string.IsNullOrWhiteSpace(_options.R2AccessKeyId)
            || string.IsNullOrWhiteSpace(_options.R2SecretAccessKey)
            || string.IsNullOrWhiteSpace(_options.R2Bucket))
            throw new InvalidOperationException("PhotoStorage R2 settings (AccountId/AccessKeyId/SecretAccessKey/Bucket) are required for R2 provider.");
    }

    public Task<PhotoStorageResult> SaveAsync(Guid listingId, string originalFileName, string contentType, Stream content, CancellationToken ct) =>
        throw new NotImplementedException("R2 photo storage integration is wired but not yet implemented. Use PhotoStorage:Provider=Local until launch readiness work completes.");

    public Task DeleteAsync(string relativePath, CancellationToken ct) =>
        throw new NotImplementedException("R2 photo storage integration is wired but not yet implemented.");

    public string BuildPublicUrl(string relativePath) =>
        throw new NotImplementedException("R2 photo storage integration is wired but not yet implemented.");
}
