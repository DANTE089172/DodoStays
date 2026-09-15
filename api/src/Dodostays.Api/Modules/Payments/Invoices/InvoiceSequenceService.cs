using System.Data;
using Dodostays.Api.Contracts.Payments;
using Dodostays.Api.Modules.Common.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
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
        var prefix = kind switch
        {
            InvoiceKind.GuestStay => _options.GuestSequencePrefix,
            InvoiceKind.HostCommission => _options.CommissionSequencePrefix,
            InvoiceKind.CreditNote => _options.CreditNoteSequencePrefix,
            _ => throw new ArgumentOutOfRangeException(nameof(kind), kind, "Unknown InvoiceKind")
        };

        var year = DateTimeOffset.UtcNow.Year;

        // Gap-free allocation (Mauritius VAT Act / MRA): atomically upsert-increment the counter
        // row for (kind, year) and return the new value. Unlike a Postgres sequence (nextval),
        // this runs INSIDE the caller's transaction — the command below enlists in
        // Database.CurrentTransaction — so if the caller rolls back, the increment is undone and
        // the number is NOT consumed. The row-level lock taken by the UPDATE also serialises
        // concurrent allocations for the same series, guaranteeing a contiguous sequence.
        var connection = _db.Database.GetDbConnection();
        if (connection.State != ConnectionState.Open)
            await connection.OpenAsync(ct);

        await using var command = connection.CreateCommand();
        command.Transaction = _db.Database.CurrentTransaction?.GetDbTransaction();
        command.CommandText =
            """
            INSERT INTO invoice_counters (kind, year, last_value)
            VALUES (@kind, @year, 1)
            ON CONFLICT (kind, year)
            DO UPDATE SET last_value = invoice_counters.last_value + 1
            RETURNING last_value;
            """;

        var kindParam = command.CreateParameter();
        kindParam.ParameterName = "kind";
        kindParam.Value = (int)kind;
        command.Parameters.Add(kindParam);

        var yearParam = command.CreateParameter();
        yearParam.ParameterName = "year";
        yearParam.Value = year;
        command.Parameters.Add(yearParam);

        var result = await command.ExecuteScalarAsync(ct);
        var seq = Convert.ToInt64(result);

        var invoiceNumber = $"{prefix}-{year}-{seq:D5}";

        _logger.LogDebug("Allocated gap-free invoice number {InvoiceNumber} for {Kind}/{Year}", invoiceNumber, kind, year);

        return invoiceNumber;
    }
}
