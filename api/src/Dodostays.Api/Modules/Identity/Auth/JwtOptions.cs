namespace Dodostays.Api.Modules.Identity.Auth;

public sealed class JwtOptions
{
    public string Issuer { get; set; } = "dodostays";
    public string Audience { get; set; } = "dodostays";
    public string SigningKey { get; set; } = string.Empty;
    public TimeSpan AccessTokenLifetime { get; set; } = TimeSpan.FromMinutes(15);
    public TimeSpan RefreshTokenLifetime { get; set; } = TimeSpan.FromDays(30);
}
