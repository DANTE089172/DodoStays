namespace Dodostays.Api.Contracts.Identity;

public sealed record HostProfileDto(
    Guid UserId,
    string LegalName,
    string TamLicenseNumber,
    string? VatNumber,
    string? BankAccountLast4,
    string? BankName);
