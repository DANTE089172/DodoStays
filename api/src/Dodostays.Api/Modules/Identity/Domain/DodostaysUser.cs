using Microsoft.AspNetCore.Identity;
using Dodostays.Api.Contracts.Identity;

namespace Dodostays.Api.Modules.Identity.Domain;

public class DodostaysUser : IdentityUser<Guid>
{
    public string DisplayName { get; set; } = string.Empty;
    public string PreferredLanguage { get; set; } = "en";
    public UserRole Role { get; set; } = UserRole.Guest;
    public KycStatus KycStatus { get; set; } = KycStatus.NotStarted;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public HostProfile? HostProfile { get; set; }
}
