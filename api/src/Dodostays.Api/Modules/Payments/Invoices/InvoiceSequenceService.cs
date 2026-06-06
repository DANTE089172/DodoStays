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

        // Fetch next sequence value via raw ADO.NET. Sequence name is validated via the switch above
        // (whitelist), preventing SQL injection. Direct string interpolation is safe here because
        // sequenceName is constrained to one of three hardcoded values.
        var connection = _db.Database.GetDbConnection();
        await using var command = connection.CreateCommand();
        command.CommandText = $"SELECT nextval('{sequenceName}')";

        if (connection.State != System.Data.ConnectionState.Open)
            await connection.OpenAsync(ct);

        var result = await command.ExecuteScalarAsync(ct);
        var seq = Convert.ToInt64(result);

        var year = DateTimeOffset.UtcNow.Year;
        var invoiceNumber = $"{prefix}-{year}-{seq:D5}";

        _logger.LogDebug("Allocated invoice number {InvoiceNumber} from sequence {SequenceName}", invoiceNumber, sequenceName);

        return invoiceNumber;
    }
}
