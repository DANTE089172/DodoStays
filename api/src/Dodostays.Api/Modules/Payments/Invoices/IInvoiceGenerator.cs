using Dodostays.Api.Modules.Payments.Domain;

namespace Dodostays.Api.Modules.Payments.Invoices;

public interface IInvoiceGenerator
{
    /// <summary>
    /// Generates the PDF for a guest stay invoice and persists it via IInvoicePdfStorage.
    /// Returns the populated Invoice entity (NOT yet attached to DbContext — caller adds it).
    /// VAT 15% MRA-compliant breakdown; merchant info from PaymentOptions.
    /// </summary>
    Task<Invoice> GenerateGuestStayAsync(GuestInvoiceInput input, CancellationToken ct);

    /// <summary>
    /// Generates the host commission invoice for a payout — VAT 15% on the commission.
    /// </summary>
    Task<Invoice> GenerateHostCommissionAsync(HostCommissionInvoiceInput input, CancellationToken ct);
}

public sealed record GuestInvoiceInput(
    Guid BookingId,
    string GuestDisplayName,
    string? GuestVatNumber,
    string ListingTitle,
    DateOnly CheckIn,
    DateOnly CheckOut,
    int Nights,
    decimal NightlyRateNetMur,
    decimal CleaningFeeNetMur,
    decimal DamageDepositMur);

public sealed record HostCommissionInvoiceInput(
    Guid BookingId,
    Guid PayoutId,
    string HostDisplayName,
    string? HostVatNumber,
    string ListingTitle,
    decimal CommissionNetMur);
