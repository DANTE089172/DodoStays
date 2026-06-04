namespace Dodostays.Api.Contracts.Identity;

public sealed record SignUpRequest(
    string Email,
    string Password,
    string DisplayName,
    string PreferredLanguage,
    UserRole IntendedRole);
