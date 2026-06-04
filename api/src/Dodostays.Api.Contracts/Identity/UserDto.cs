namespace Dodostays.Api.Contracts.Identity;

public sealed record UserDto(
    Guid Id,
    string Email,
    string DisplayName,
    string PreferredLanguage,
    UserRole Role,
    KycStatus KycStatus,
    bool TwoFactorEnabled);
