using Dodostays.Api.Contracts.Payments;

namespace Dodostays.Api.Modules.Payments.Invoices;

public interface IInvoiceSequenceService
{
    /// <summary>
    /// Allocates the next invoice number for the given kind, formatted as
    /// "{prefix}-{YYYY}-{seq:D5}". e.g. "DS-2026-00001".
    ///
    /// CRITICAL: allocation is post-commit safe — uses a row-level transaction so a rollback
    /// does NOT consume a sequence value. This satisfies MRA gap-free numbering.
    /// </summary>
    Task<string> NextNumberAsync(InvoiceKind kind, CancellationToken ct);
}
