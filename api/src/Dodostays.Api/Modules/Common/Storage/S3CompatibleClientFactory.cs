using Minio;

namespace Dodostays.Api.Modules.Common.Storage;

/// <summary>
/// Builds a MinIO client for an S3-compatible object store. Cloudflare R2 is S3-compatible, so
/// the same client talks to R2 in production and to a MinIO container in tests — no behavioural
/// divergence between the two. R2's endpoint is <c>{accountId}.r2.cloudflarestorage.com</c>;
/// tests/self-hosting pass an explicit host:port instead.
/// </summary>
public static class S3CompatibleClientFactory
{
    public static string R2Endpoint(string accountId) => $"{accountId}.r2.cloudflarestorage.com";

    public static IMinioClient Create(string endpoint, string accessKey, string secretKey, bool useSsl, string region = "auto")
        => new MinioClient()
            .WithEndpoint(endpoint)
            .WithCredentials(accessKey, secretKey)
            .WithRegion(region)
            .WithSSL(useSsl)
            .Build();
}
