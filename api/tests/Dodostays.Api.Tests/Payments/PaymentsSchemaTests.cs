using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Xunit;
using Dodostays.Api.Contracts.Payments;
using Dodostays.Api.Modules.Payments.Domain;

namespace Dodostays.Api.Tests.Payments;

/// <summary>
/// Plan 04.1 schema smoke test: confirms the Payments entity configurations apply cleanly,
/// declare the expected indexes, sequences and column types, and roundtrip data through the
/// in-memory provider.
///
/// We use a minimal isolated DbContext (just the Payments entities) rather than the full
/// <c>DodostaysDbContext</c> because the existing Listings model uses PostGIS-only constructs
/// (geography, integer[] with Amenity converter) that the in-memory provider can't resolve.
/// This isolates the Payments slice while still exercising the real configuration code.
/// </summary>
public class PaymentsSchemaTests
{
    private sealed class PaymentsOnlyDbContext : DbContext
    {
        public PaymentsOnlyDbContext(DbContextOptions<PaymentsOnlyDbContext> options) : base(options) { }

        public DbSet<PaymentRecord> PaymentRecords => Set<PaymentRecord>();
        public DbSet<HostPayout> HostPayouts => Set<HostPayout>();
        public DbSet<Invoice> Invoices => Set<Invoice>();
        public DbSet<IdempotencyKey> IdempotencyKeys => Set<IdempotencyKey>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Mirror DodostaysDbContext.OnModelCreatingPayments — calls the same internal config.
            // We invoke the partial DbContext path by replicating the call site.
            Dodostays.Api.Modules.Common.Database.PaymentsConfigurationTestHook.Invoke(modelBuilder);
        }
    }

    private static PaymentsOnlyDbContext NewContext()
    {
        var opts = new DbContextOptionsBuilder<PaymentsOnlyDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new PaymentsOnlyDbContext(opts);
    }

    [Fact]
    public void All_four_entities_are_registered()
    {
        using var ctx = NewContext();
        var model = ctx.Model;

        model.FindEntityType(typeof(PaymentRecord)).Should().NotBeNull();
        model.FindEntityType(typeof(HostPayout)).Should().NotBeNull();
        model.FindEntityType(typeof(Invoice)).Should().NotBeNull();
        model.FindEntityType(typeof(IdempotencyKey)).Should().NotBeNull();
    }

    [Fact]
    public void Invoice_number_has_unique_index()
    {
        using var ctx = NewContext();
        var invoice = ctx.Model.FindEntityType(typeof(Invoice))!;
        invoice.GetIndexes()
            .Should().Contain(i => i.IsUnique && i.Properties.Any(p => p.Name == nameof(Invoice.Number)));
    }

    [Fact]
    public void IdempotencyKey_has_unique_keyhash_and_expires_indexes()
    {
        using var ctx = NewContext();
        var idem = ctx.Model.FindEntityType(typeof(IdempotencyKey))!;
        idem.GetIndexes()
            .Should().Contain(i => i.IsUnique && i.Properties.Any(p => p.Name == nameof(IdempotencyKey.KeyHash)));
        idem.GetIndexes()
            .Should().Contain(i => i.Properties.Any(p => p.Name == nameof(IdempotencyKey.ExpiresAt)));
    }

    private static string? GetConfiguredColumnType(Microsoft.EntityFrameworkCore.Metadata.IProperty p)
        // The relational GetColumnType() helper requires a relational provider; in the in-memory
        // model we read the raw annotation that HasColumnType() sets.
        => p.FindAnnotation("Relational:ColumnType")?.Value as string;

    [Fact]
    public void PaymentRecord_has_bookingid_index_and_jsonb_payload()
    {
        using var ctx = NewContext();
        var pay = ctx.Model.FindEntityType(typeof(PaymentRecord))!;
        pay.GetIndexes()
            .Should().Contain(i => i.Properties.Any(p => p.Name == nameof(PaymentRecord.BookingId)));
        GetConfiguredColumnType(pay.FindProperty(nameof(PaymentRecord.RawPayloadJson))!)
            .Should().Be("jsonb");
    }

    [Fact]
    public void HostPayout_has_uuid_array_and_hostid_index()
    {
        using var ctx = NewContext();
        var p = ctx.Model.FindEntityType(typeof(HostPayout))!;
        GetConfiguredColumnType(p.FindProperty(nameof(HostPayout.BookingIds))!).Should().Be("uuid[]");
        p.GetIndexes().Should().Contain(i => i.Properties.Any(pp => pp.Name == nameof(HostPayout.HostUserId)));
    }

    [Fact]
    public void Money_columns_have_precision_18_2()
    {
        using var ctx = NewContext();
        var amt = ctx.Model.FindEntityType(typeof(PaymentRecord))!.FindProperty(nameof(PaymentRecord.AmountMur))!;
        amt.GetPrecision().Should().Be(18);
        amt.GetScale().Should().Be(2);
    }

    [Fact]
    public void Three_invoice_sequences_are_registered()
    {
        using var ctx = NewContext();
        var sequences = ctx.Model.GetSequences().Select(s => s.Name).ToHashSet();
        sequences.Should().Contain("inv_guest_seq");
        sequences.Should().Contain("inv_commission_seq");
        sequences.Should().Contain("inv_credit_note_seq");
    }

    [Fact]
    public async Task Roundtrip_one_of_each_entity()
    {
        var bookingId = Guid.NewGuid();
        var hostId = Guid.NewGuid();
        var dbName = Guid.NewGuid().ToString();

        var opts = new DbContextOptionsBuilder<PaymentsOnlyDbContext>()
            .UseInMemoryDatabase(dbName).Options;

        await using (var ctx = new PaymentsOnlyDbContext(opts))
        {
            ctx.PaymentRecords.Add(new PaymentRecord
            {
                BookingId = bookingId,
                ProcessorId = "InMemory",
                ExternalRef = "im-12345",
                AmountMur = 18170.00m,
                Status = PaymentStatus.Captured,
                AttemptedAt = DateTimeOffset.UtcNow,
                SucceededAt = DateTimeOffset.UtcNow,
                RawPayloadJson = "{\"foo\":\"bar\"}"
            });
            ctx.HostPayouts.Add(new HostPayout
            {
                HostUserId = hostId,
                BookingIds = new List<Guid> { bookingId },
                TotalGrossMur = 18170.00m,
                CommissionMur = 1271.90m,
                NetMur = 16898.10m,
                Status = PayoutStatus.Pending,
                ProcessorId = "InMemory",
                AttemptedAt = DateTimeOffset.UtcNow
            });
            ctx.Invoices.Add(new Invoice
            {
                Number = "DS-2026-00001",
                Kind = InvoiceKind.GuestStay,
                BookingId = bookingId,
                IssuedToDisplayName = "Devarshi Ramnauth",
                GrossMur = 18170.00m,
                VatMur = 2370.00m,
                NetMur = 15800.00m,
                PdfStoragePath = "wwwroot/invoices/2026/06/DS-2026-00001.pdf",
                IssuedAt = DateTimeOffset.UtcNow
            });
            ctx.IdempotencyKeys.Add(new IdempotencyKey
            {
                KeyHash = "sha256-abcdef",
                Scope = "confirm-booking",
                BookingId = bookingId,
                ResponseBodyJson = "{\"id\":\"" + bookingId + "\"}",
                HttpStatusCode = 200,
                CreatedAt = DateTimeOffset.UtcNow,
                ExpiresAt = DateTimeOffset.UtcNow.AddHours(24)
            });
            await ctx.SaveChangesAsync();
        }

        await using (var ctx = new PaymentsOnlyDbContext(opts))
        {
            (await ctx.PaymentRecords.SingleAsync()).ExternalRef.Should().Be("im-12345");
            (await ctx.HostPayouts.SingleAsync()).BookingIds.Should().ContainSingle().Which.Should().Be(bookingId);
            (await ctx.Invoices.SingleAsync()).Number.Should().Be("DS-2026-00001");
            (await ctx.IdempotencyKeys.SingleAsync()).HttpStatusCode.Should().Be(200);
        }
    }
}
