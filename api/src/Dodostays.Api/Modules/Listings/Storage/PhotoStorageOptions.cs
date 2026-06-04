namespace Dodostays.Api.Modules.Listings.Storage;

public sealed class PhotoStorageOptions
{
    public string Provider { get; set; } = "Local";
    public string LocalRoot { get; set; } = string.Empty;
    public string PublicBaseUrl { get; set; } = string.Empty;
    public string? R2AccountId { get; set; }
    public string? R2AccessKeyId { get; set; }
    public string? R2SecretAccessKey { get; set; }
    public string? R2Bucket { get; set; }
    public long MaxFileSizeBytes { get; set; } = 8 * 1024 * 1024;
}
