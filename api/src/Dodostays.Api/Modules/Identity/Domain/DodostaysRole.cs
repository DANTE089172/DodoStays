using Microsoft.AspNetCore.Identity;

namespace Dodostays.Api.Modules.Identity.Domain;

public class DodostaysRole : IdentityRole<Guid>
{
    public DodostaysRole() { }
    public DodostaysRole(string name) : base(name) { }
}
