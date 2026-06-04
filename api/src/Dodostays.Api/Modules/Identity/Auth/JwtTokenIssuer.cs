using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Dodostays.Api.Modules.Identity.Domain;

namespace Dodostays.Api.Modules.Identity.Auth;

public sealed class JwtTokenIssuer
{
    private readonly JwtOptions _options;

    public JwtTokenIssuer(IOptions<JwtOptions> options)
    {
        _options = options.Value;
        if (_options.SigningKey.Length < 32)
            throw new InvalidOperationException("Jwt:SigningKey must be at least 32 characters.");
    }

    public (string Token, DateTimeOffset ExpiresAt) IssueAccessToken(DodostaysUser user)
    {
        var expiresAt = DateTimeOffset.UtcNow.Add(_options.AccessTokenLifetime);
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SigningKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new("sub", user.Id.ToString()),
            new("email", user.Email ?? string.Empty),
            new("role", user.Role.ToString()),
            new("kyc", user.KycStatus.ToString()),
            new("lang", user.PreferredLanguage)
        };

        var jwt = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            expires: expiresAt.UtcDateTime,
            signingCredentials: creds);

        var token = new JwtSecurityTokenHandler().WriteToken(jwt);
        return (token, expiresAt);
    }

    public (string Raw, string Hash) IssueRefreshToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        var raw = Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
        return (raw, HashRefreshToken(raw));
    }

    public string HashRefreshToken(string raw)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(raw));
        return Convert.ToHexString(bytes);
    }

    public TimeSpan RefreshTokenLifetime => _options.RefreshTokenLifetime;
}
