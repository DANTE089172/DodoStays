using Dodostays.Api.Contracts.Payments;
using Dodostays.Api.Modules.Common.Database;
using Dodostays.Api.Modules.Payments.Invoices;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using System.Text.RegularExpressions;
using Xunit;

namespace Dodostays.Api.IntegrationTests.Payments;

public class InvoiceSequenceServiceTests : IClassFixture<PostgresFixture>
{
    private readonly PostgresFixture _fx;

    public InvoiceSequenceServiceTests(PostgresFixture fx) => _fx = fx;

    [Fact]
    public async Task NextNumber_FirstCall_ReturnsExpectedFormat()
    {
        await using var db = CreateDbContext();
        var service = new InvoiceSequenceService(
            db,
            Options.Create(new InvoicingOptions { GuestSequencePrefix = "DS" }),
            NullLogger<InvoiceSequenceService>.Instance);

        var number = await service.NextNumberAsync(InvoiceKind.GuestStay, CancellationToken.None);

        // Should match pattern: DS-YYYY-00001
        number.Should().MatchRegex(@"^DS-\d{4}-\d{5}$");
    }

    [Fact]
    public async Task NextNumber_IsMonotonic_AcrossCalls()
    {
        await using var db = CreateDbContext();
        var service = new InvoiceSequenceService(
            db,
            Options.Create(new InvoicingOptions { GuestSequencePrefix = "DS" }),
            NullLogger<InvoiceSequenceService>.Instance);

        var num1 = await service.NextNumberAsync(InvoiceKind.GuestStay, CancellationToken.None);
        var num2 = await service.NextNumberAsync(InvoiceKind.GuestStay, CancellationToken.None);
        var num3 = await service.NextNumberAsync(InvoiceKind.GuestStay, CancellationToken.None);

        // Extract sequence numbers
        var seq1 = ExtractSequence(num1);
        var seq2 = ExtractSequence(num2);
        var seq3 = ExtractSequence(num3);

        // Should be monotonically increasing
        seq2.Should().BeGreaterThan(seq1);
        seq3.Should().BeGreaterThan(seq2);
    }

    [Fact]
    public async Task NextNumber_DifferentKinds_AreIndependent()
    {
        await using var db = CreateDbContext();
        var service = new InvoiceSequenceService(
            db,
            Options.Create(new InvoicingOptions
            {
                GuestSequencePrefix = "DS",
                CommissionSequencePrefix = "DS-COM"
            }),
            NullLogger<InvoiceSequenceService>.Instance);

        var guestNum1 = await service.NextNumberAsync(InvoiceKind.GuestStay, CancellationToken.None);
        var commissionNum = await service.NextNumberAsync(InvoiceKind.HostCommission, CancellationToken.None);
        var guestNum2 = await service.NextNumberAsync(InvoiceKind.GuestStay, CancellationToken.None);

        var guestSeq1 = ExtractSequence(guestNum1);
        var guestSeq2 = ExtractSequence(guestNum2);

        // Guest sequence should increment independently of commission sequence
        guestSeq2.Should().Be(guestSeq1 + 1);
        commissionNum.Should().StartWith("DS-COM-");
    }

    private DodostaysDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<DodostaysDbContext>()
            .UseNpgsql(_fx.ConnectionString, npg => npg.UseNetTopologySuite())
            .Options;
        return new DodostaysDbContext(options);
    }

    private static long ExtractSequence(string invoiceNumber)
    {
        // Extract the trailing 5-digit sequence from "DS-2026-00001" format
        var match = Regex.Match(invoiceNumber, @"-(\d{5})$");
        match.Success.Should().BeTrue($"Expected invoice number to end with 5 digits: {invoiceNumber}");
        return long.Parse(match.Groups[1].Value);
    }
}
