namespace Dodostays.Api.Modules.Payments.Invoices;

public sealed class LocalDiskInvoicePdfStorage : IInvoicePdfStorage
{
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<LocalDiskInvoicePdfStorage> _logger;

    public LocalDiskInvoicePdfStorage(IWebHostEnvironment env, ILogger<LocalDiskInvoicePdfStorage> logger)
    {
        _env = env;
        _logger = logger;
    }

    public async Task<string> StoreAsync(string invoiceNumber, byte[] pdfBytes, CancellationToken ct)
    {
        var year = DateTimeOffset.UtcNow.Year;
        var month = DateTimeOffset.UtcNow.Month;
        var relPath = $"invoices/{year}/{month:D2}/{invoiceNumber}.pdf";
        var fullPath = Path.Combine(_env.WebRootPath, relPath);

        // Ensure directory exists
        var directory = Path.GetDirectoryName(fullPath)!;
        Directory.CreateDirectory(directory);

        await File.WriteAllBytesAsync(fullPath, pdfBytes, ct);

        // Return with forward slashes (normalize for consistency across platforms)
        var normalizedPath = relPath.Replace('\\', '/');
        _logger.LogDebug("Stored invoice PDF at {StoragePath}", normalizedPath);

        return normalizedPath;
    }

    public async Task<byte[]?> ReadAsync(string storagePath, CancellationToken ct)
    {
        // Convert forward slashes to platform-specific separator
        var platformPath = storagePath.Replace('/', Path.DirectorySeparatorChar);
        var fullPath = Path.Combine(_env.WebRootPath, platformPath);

        if (!File.Exists(fullPath))
        {
            _logger.LogWarning("Invoice PDF not found at {StoragePath}", storagePath);
            return null;
        }

        return await File.ReadAllBytesAsync(fullPath, ct);
    }
}
