using Dodostays.Api.Contracts.Payments;

namespace Dodostays.Api.Modules.Payments.Domain;

/// <summary>
/// Gap-free invoice number allocator, one row per (<see cref="Kind"/>, <see cref="Year"/>).
///
/// This deliberately replaces Postgres sequences (nextval). A sequence is NOT transactional:
/// a rolled-back invoice permanently burns its allocated value, leaving a gap in the series —
/// which the Mauritius VAT Act / MRA does not permit. This counter is incremented with an
/// atomic upsert that participates in the caller's transaction, so a rollback releases the
/// number and the next invoice reuses it. See <c>InvoiceSequenceService</c>.
/// </summary>
public class InvoiceCounter
{
    public InvoiceKind Kind { get; set; }

    /// <summary>Calendar year the series belongs to; the sequence resets to 1 each year.</summary>
    public int Year { get; set; }

    /// <summary>Highest number allocated so far for this (Kind, Year).</summary>
    public long LastValue { get; set; }
}
