using Dodostays.Api.Contracts.Payments;

namespace Dodostays.Api.Modules.Payments.Invoices;

public interface IInvoiceSequenceService
{
    /// <summary>
    /// Allocates the next invoice number for the given kind, formatted as
    /// "{prefix}-{YYYY}-{seq:D5}". e.g. "DS-2026-00001". The series resets each calendar year.
    ///
    /// GAP-FREE (Mauritius VAT Act / MRA): the number is drawn from a transactional counter,
    /// NOT a Postgres sequence. It is consumed only if the caller's transaction commits — a
    /// rollback releases it, so the next invoice reuses it and the series has no gaps.
    /// CALLER CONTRACT: invoke inside the same transaction that persists the Invoice row
    /// (e.g. wrap the confirm/payout flow in BeginTransaction/Commit) so the allocation and the
    /// row commit atomically.
    /// </summary>
    Task<string> NextNumberAsync(InvoiceKind kind, CancellationToken ct);
}
