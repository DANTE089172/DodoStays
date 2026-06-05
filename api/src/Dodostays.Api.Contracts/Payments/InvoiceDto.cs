namespace Dodostays.Api.Contracts.Payments;

public sealed record InvoiceDto(
    Guid Id,
    string Number,
    InvoiceKind Kind,
    Guid BookingId,
    string IssuedToDisplayName,
    string? IssuedToVatNumber,
    decimal GrossMur,
    decimal VatMur,
    decimal NetMur,
    DateTimeOffset IssuedAt,
    string DownloadUrl);
