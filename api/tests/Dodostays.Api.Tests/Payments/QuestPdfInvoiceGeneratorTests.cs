using Dodostays.Api.Contracts.Payments;
using Dodostays.Api.Modules.Payments.Invoices;
using Dodostays.Api.Modules.Payments.Processing;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace Dodostays.Api.Tests.Payments;

public class QuestPdfInvoiceGeneratorTests
{
    private readonly FakeInvoiceSequenceService _sequenceService = new();
    private readonly FakeInvoicePdfStorage _storage = new();
    private readonly PaymentOptions _paymentOptions = new()
    {
        MerchantOfRecord = "DodoStays Ltd",
        MerchantVatNumber = "VAT12345678",
        MerchantAddress = "Port Louis, Mauritius"
    };

    public QuestPdfInvoiceGeneratorTests()
    {
        // Configure QuestPDF Community licence for tests
        QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;
    }

    [Fact]
    public async Task GenerateGuestStay_ProducesPdfWithMagicBytes()
    {
        var generator = new QuestPdfInvoiceGenerator(
            _sequenceService,
            _storage,
            Options.Create(_paymentOptions),
            NullLogger<QuestPdfInvoiceGenerator>.Instance);

        var input = new GuestInvoiceInput(
            BookingId: Guid.NewGuid(),
            GuestDisplayName: "John Doe",
            GuestVatNumber: null,
            ListingTitle: "Beach Villa",
            CheckIn: new DateOnly(2026, 6, 10),
            CheckOut: new DateOnly(2026, 6, 15),
            Nights: 5,
            NightlyRateNetMur: 1000m,
            CleaningFeeNetMur: 0m,
            DamageDepositMur: 0m);

        var invoice = await generator.GenerateGuestStayAsync(input, CancellationToken.None);

        invoice.PdfStoragePath.Should().NotBeEmpty();
        _storage.StoredFiles.Should().ContainKey(invoice.Number);
        var pdfBytes = _storage.StoredFiles[invoice.Number];
        pdfBytes.Should().NotBeEmpty();

        // Check PDF magic bytes
        var header = System.Text.Encoding.ASCII.GetString(pdfBytes.Take(4).ToArray());
        header.Should().Be("%PDF");
    }

    [Fact]
    public async Task GenerateGuestStay_VatBreakdownCorrect()
    {
        var generator = new QuestPdfInvoiceGenerator(
            _sequenceService,
            _storage,
            Options.Create(_paymentOptions),
            NullLogger<QuestPdfInvoiceGenerator>.Instance);

        var input = new GuestInvoiceInput(
            BookingId: Guid.NewGuid(),
            GuestDisplayName: "Jane Smith",
            GuestVatNumber: null,
            ListingTitle: "City Apartment",
            CheckIn: new DateOnly(2026, 6, 1),
            CheckOut: new DateOnly(2026, 6, 6),
            Nights: 5,
            NightlyRateNetMur: 1000m,
            CleaningFeeNetMur: 0m,
            DamageDepositMur: 0m);

        var invoice = await generator.GenerateGuestStayAsync(input, CancellationToken.None);

        // 5 nights × 1000 = 5000 net
        // VAT 15% = 750
        // Gross = 5750
        invoice.NetMur.Should().Be(5000m);
        invoice.VatMur.Should().Be(750m);
        invoice.GrossMur.Should().Be(5750m);
    }

    [Fact]
    public async Task GenerateGuestStay_DamageDeposit_NotInVatBase()
    {
        var generator = new QuestPdfInvoiceGenerator(
            _sequenceService,
            _storage,
            Options.Create(_paymentOptions),
            NullLogger<QuestPdfInvoiceGenerator>.Instance);

        var input = new GuestInvoiceInput(
            BookingId: Guid.NewGuid(),
            GuestDisplayName: "Alice Brown",
            GuestVatNumber: null,
            ListingTitle: "Luxury Villa",
            CheckIn: new DateOnly(2026, 7, 1),
            CheckOut: new DateOnly(2026, 7, 2),
            Nights: 1,
            NightlyRateNetMur: 2000m,
            CleaningFeeNetMur: 0m,
            DamageDepositMur: 5000m); // Damage deposit should NOT be in VAT base

        var invoice = await generator.GenerateGuestStayAsync(input, CancellationToken.None);

        // 1 night × 2000 = 2000 net (deposit excluded)
        // VAT 15% = 300
        // Gross = 2300 (deposit excluded)
        invoice.NetMur.Should().Be(2000m);
        invoice.VatMur.Should().Be(300m);
        invoice.GrossMur.Should().Be(2300m);
    }

    [Fact]
    public async Task GenerateHostCommission_VatBreakdownCorrect()
    {
        var generator = new QuestPdfInvoiceGenerator(
            _sequenceService,
            _storage,
            Options.Create(_paymentOptions),
            NullLogger<QuestPdfInvoiceGenerator>.Instance);

        var input = new HostCommissionInvoiceInput(
            BookingId: Guid.NewGuid(),
            PayoutId: Guid.NewGuid(),
            HostDisplayName: "Bob Host",
            HostVatNumber: null,
            ListingTitle: "Mountain Chalet",
            CommissionNetMur: 500m);

        var invoice = await generator.GenerateHostCommissionAsync(input, CancellationToken.None);

        // Commission net = 500
        // VAT 15% = 75
        // Gross = 575
        invoice.NetMur.Should().Be(500m);
        invoice.VatMur.Should().Be(75m);
        invoice.GrossMur.Should().Be(575m);
        invoice.Kind.Should().Be(InvoiceKind.HostCommission);
    }

    // Fake implementations for testing
    private sealed class FakeInvoiceSequenceService : IInvoiceSequenceService
    {
        private int _guestSeq = 1;
        private int _commissionSeq = 1;

        public Task<string> NextNumberAsync(InvoiceKind kind, CancellationToken ct)
        {
            var year = DateTimeOffset.UtcNow.Year;
            var number = kind switch
            {
                InvoiceKind.GuestStay => $"DS-{year}-{_guestSeq++:D5}",
                InvoiceKind.HostCommission => $"DS-COM-{year}-{_commissionSeq++:D5}",
                InvoiceKind.CreditNote => $"DS-CN-{year}-00001",
                _ => throw new ArgumentOutOfRangeException(nameof(kind))
            };
            return Task.FromResult(number);
        }
    }

    private sealed class FakeInvoicePdfStorage : IInvoicePdfStorage
    {
        public Dictionary<string, byte[]> StoredFiles { get; } = new();

        public Task<string> StoreAsync(string invoiceNumber, byte[] pdfBytes, CancellationToken ct)
        {
            StoredFiles[invoiceNumber] = pdfBytes;
            var year = DateTimeOffset.UtcNow.Year;
            var month = DateTimeOffset.UtcNow.Month;
            return Task.FromResult($"invoices/{year}/{month:D2}/{invoiceNumber}.pdf");
        }

        public Task<byte[]?> ReadAsync(string storagePath, CancellationToken ct)
        {
            // Extract invoice number from path
            var fileName = Path.GetFileNameWithoutExtension(storagePath);
            return Task.FromResult(StoredFiles.GetValueOrDefault(fileName));
        }
    }
}
