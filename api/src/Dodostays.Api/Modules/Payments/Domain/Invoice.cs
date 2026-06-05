using Dodostays.Api.Contracts.Payments;

namespace Dodostays.Api.Modules.Payments.Domain;

public class Invoice
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Number { get; set; } = string.Empty;
    public InvoiceKind Kind { get; set; }
    public Guid BookingId { get; set; }

    /// <summary>
    /// Set only when <see cref="Kind"/> is <see cref="InvoiceKind.HostCommission"/>.
    /// </summary>
    public Guid? PayoutId { get; set; }

    public string IssuedToDisplayName { get; set; } = string.Empty;
    public string? IssuedToVatNumber { get; set; }
    public decimal GrossMur { get; set; }
    public decimal VatMur { get; set; }
    public decimal NetMur { get; set; }
    public string PdfStoragePath { get; set; } = string.Empty;
    public DateTimeOffset IssuedAt { get; set; } = DateTimeOffset.UtcNow;
}
