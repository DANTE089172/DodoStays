namespace Dodostays.Api.Modules.Payments.Invoices;

public interface IInvoicePdfStorage
{
    /// <summary>
    /// Stores the PDF bytes under the invoice number, returns the relative storage path
    /// (e.g. "invoices/2026/06/DS-2026-00001.pdf"). Path is relative to wwwroot.
    /// </summary>
    Task<string> StoreAsync(string invoiceNumber, byte[] pdfBytes, CancellationToken ct);

    /// <summary>
    /// Returns the bytes back if found; null if missing.
    /// </summary>
    Task<byte[]?> ReadAsync(string storagePath, CancellationToken ct);
}
