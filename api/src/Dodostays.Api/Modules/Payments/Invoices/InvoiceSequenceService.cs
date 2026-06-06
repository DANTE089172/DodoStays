using Dodostays.Api.Contracts.Payments;
using Dodostays.Api.Modules.Common.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Dodostays.Api.Modules.Payments.Invoices;

public sealed class InvoiceSequenceService : IInvoiceSequenceService
{
    private readonly DodostaysDbContext _db;
    private readonly InvoicingOptions _options;
    private readonly ILogger<InvoiceSequenceService> _logger;

    public InvoiceSequenceService(
        DodostaysDbContext db,
        IOptions<InvoicingOptions> options,
        ILogger<InvoiceSequenceService> logger)
    {
        _db = db;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<string> NextNumberAsync(InvoiceKind kind, CancellationToken ct)
    {
        var (sequenceName, prefix) = kind switch
        {
            InvoiceKind.GuestStay => ("inv_guest_seq", _options.GuestSequencePrefix),
            InvoiceKind.HostCommission => ("inv_commission_seq", _options.CommissionSequencePrefix),
            InvoiceKind.CreditNote => ("inv_credit_note_seq", _options.CreditNoteSequencePrefix),
            _ => throw new ArgumentOutOfRangeException(nameof(kind), kind, "Unknown InvoiceKind")
        };

        // Use SqlQuery to fetch next sequence value. Sequence name is validated via the switch above
        // (whitelist), preventing SQL injection. FormattableString is used for safe interpolation.
        FormattableString sql = $"SELECT nextval('{sequenceName}')";
        var seq = await _db.Database
            .SqlQuery<long>(sql)
            .SingleAsync(ct);

        var year = DateTimeOffset.UtcNow.Year;
        var invoiceNumber = $"{prefix}-{year}-{seq:D5}";

        _logger.LogDebug("Allocated invoice number {InvoiceNumber} from sequence {SequenceName}", invoiceNumber, sequenceName);

        return invoiceNumber;
    }
}
