namespace Dodostays.Api.Modules.Identity.Domain;

public class HostProfile
{
    public Guid UserId { get; set; }
    public DodostaysUser User { get; set; } = null!;
    public string LegalName { get; set; } = string.Empty;
    public string TamLicenseNumber { get; set; } = string.Empty;
    public string? VatNumber { get; set; }
    public string? BankAccountLast4 { get; set; }
    public string? BankName { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
