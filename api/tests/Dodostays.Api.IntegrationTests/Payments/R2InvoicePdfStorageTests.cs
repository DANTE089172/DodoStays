using System.Text;
using Dodostays.Api.Modules.Common.Storage;
using Dodostays.Api.Modules.Payments.Invoices;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Minio;
using Minio.DataModel.Args;
using Testcontainers.Minio;
using Xunit;

namespace Dodostays.Api.IntegrationTests.Payments;

/// <summary>
/// Proves the Cloudflare R2 invoice storage against a real S3-compatible store (MinIO container).
/// R2 is S3-compatible and the production and test paths use the identical MinIO client, so a
/// green round-trip here means the R2 provider genuinely stores and retrieves invoice PDFs.
/// </summary>
public class R2InvoicePdfStorageTests : IAsyncLifetime
{
    // The default MinioBuilder image (minio/minio) is blocked by this environment's registry
    // allowlist; the Chainguard rebuild of the same MinIO server is pullable and S3-compatible.
    private readonly MinioContainer _minio = new MinioBuilder().WithImage("chainguard/minio:latest").Build();
    private const string Bucket = "dodostays-invoices-test";

    public async Task InitializeAsync()
    {
        await _minio.StartAsync();

        // Create the bucket up-front (R2 buckets are provisioned out-of-band in production).
        var client = S3CompatibleClientFactory.Create(Endpoint, _minio.GetAccessKey(), _minio.GetSecretKey(), useSsl: false);
        var exists = await client.BucketExistsAsync(new BucketExistsArgs().WithBucket(Bucket));
        if (!exists)
            await client.MakeBucketAsync(new MakeBucketArgs().WithBucket(Bucket));
    }

    public async Task DisposeAsync() => await _minio.DisposeAsync();

    private string Endpoint
    {
        get
        {
            var uri = new Uri(_minio.GetConnectionString());
            return $"{uri.Host}:{uri.Port}";
        }
    }

    private R2InvoicePdfStorage CreateStorage() => new(
        Options.Create(new InvoicingOptions
        {
            StorageProvider = "R2",
            R2Endpoint = Endpoint,
            R2UseSsl = false,
            R2AccessKeyId = _minio.GetAccessKey(),
            R2SecretAccessKey = _minio.GetSecretKey(),
            R2Bucket = Bucket
        }),
        NullLogger<R2InvoicePdfStorage>.Instance);

    [Fact]
    public async Task Store_then_Read_roundtrips_the_pdf_bytes()
    {
        var storage = CreateStorage();
        var pdf = Encoding.UTF8.GetBytes("%PDF-1.4 fake invoice payload for round-trip test");

        var path = await storage.StoreAsync("DS-2026-00042", pdf, CancellationToken.None);
        path.Should().MatchRegex(@"^invoices/\d{4}/\d{2}/DS-2026-00042\.pdf$");

        var readBack = await storage.ReadAsync(path, CancellationToken.None);
        readBack.Should().NotBeNull();
        readBack.Should().Equal(pdf);
    }

    [Fact]
    public async Task Read_missing_object_returns_null()
    {
        var storage = CreateStorage();

        var result = await storage.ReadAsync("invoices/2026/01/DS-2026-99999.pdf", CancellationToken.None);

        result.Should().BeNull();
    }
}
