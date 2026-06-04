namespace Dodostays.Api.Contracts.Identity;

public sealed record AuthResponse(
    string AccessToken,
    DateTimeOffset AccessTokenExpiresAt,
    UserDto User);
