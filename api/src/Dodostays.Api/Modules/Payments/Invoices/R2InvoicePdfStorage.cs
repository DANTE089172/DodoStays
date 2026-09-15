using Dodostays.Api.Modules.Common.Storage;
using Microsoft.Extensions.Options;
using Minio;
using Minio.DataModel.Args;
using Minio.Exceptions;

namespace Dodostays.Api.Modules.Payments.Invoices;

/// <summary>
/// Stores invoice PDFs in Cloudflare R2 (S3-compatible), so they survive machine replacement —
/// unlike <see cref="LocalDiskInvoicePdfStorage"/>, which writes to the ephemeral Fly volume.
/// Invoices are private, so reads stream the bytes back through the API rather than exposing a
/// public URL. The storage key doubles as the returned storage path.
/// </summary>
public sealed class R2InvoicePdfStorage : IInvoicePdfStorage
{
    private readonly IMinioClient _client;
    private readonly string _bucket;
    private readonly ILogger<R2InvoicePdfStorage> _logger;

    public R2InvoicePdfStorage(IOptions<InvoicingOptions> options, ILogger<R2InvoicePdfStorage> logger)
    {
        _logger = logger;
        var o = options.Value;

        if (string.IsNullOrWhiteSpace(o.R2AccessKeyId)
            || string.IsNullOrWhiteSpace(o.R2SecretAccessKey)
            || string.IsNullOrWhiteSpace(o.R2Bucket))
            throw new InvalidOperationException("Invoicing R2 settings (R2AccessKeyId/R2SecretAccessKey/R2Bucket) are required for the R2 storage provider.");

        var endpoint = !string.IsNullOrWhiteSpace(o.R2Endpoint)
            ? o.R2Endpoint!
            : !string.IsNullOrWhiteSpace(o.R2AccountId)
                ? S3CompatibleClientFactory.R2Endpoint(o.R2AccountId!)
                : throw new InvalidOperationException("Invoicing R2 storage requires either R2Endpoint or R2AccountId.");

        _client = S3CompatibleClientFactory.Create(endpoint, o.R2AccessKeyId!, o.R2SecretAccessKey!, o.R2UseSsl);
        _bucket = o.R2Bucket!;
    }

    public async Task<string> StoreAsync(string invoiceNumber, byte[] pdfBytes, CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;
        var key = $"invoices/{now.Year}/{now.Month:D2}/{invoiceNumber}.pdf";

        using var ms = new MemoryStream(pdfBytes, writable: false);
        await _client.PutObjectAsync(new PutObjectArgs()
            .WithBucket(_bucket)
            .WithObject(key)
            .WithStreamData(ms)
            .WithObjectSize(ms.Length)
            .WithContentType("application/pdf"), ct);

        _logger.LogDebug("Stored invoice PDF in R2 bucket {Bucket} at {Key}", _bucket, key);
        return key;
    }

    public async Task<byte[]?> ReadAsync(string storagePath, CancellationToken ct)
    {
        try
        {
            using var ms = new MemoryStream();
            await _client.GetObjectAsync(new GetObjectArgs()
                .WithBucket(_bucket)
                .WithObject(storagePath)
                .WithCallbackStream(async (stream, token) => await stream.CopyToAsync(ms, token)), ct);
            return ms.ToArray();
        }
        catch (ObjectNotFoundException)
        {
            _logger.LogWarning("Invoice PDF not found in R2 at {Key}", storagePath);
            return null;
        }
        catch (BucketNotFoundException)
        {
            _logger.LogWarning("R2 bucket {Bucket} not found", _bucket);
            return null;
        }
    }
}
