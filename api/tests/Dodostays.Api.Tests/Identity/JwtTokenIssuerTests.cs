using System.IdentityModel.Tokens.Jwt;
using FluentAssertions;
using Microsoft.Extensions.Options;
using Xunit;
using Dodostays.Api.Modules.Identity.Auth;
using Dodostays.Api.Modules.Identity.Domain;
using Dodostays.Api.Contracts.Identity;

namespace Dodostays.Api.Tests.Identity;

public class JwtTokenIssuerTests
{
    private static JwtTokenIssuer CreateIssuer()
    {
        var options = Options.Create(new JwtOptions
        {
            Issuer = "dodostays-test",
            Audience = "dodostays-test",
            SigningKey = "test-signing-key-must-be-at-least-32-chars-long-please",
            AccessTokenLifetime = TimeSpan.FromMinutes(15),
            RefreshTokenLifetime = TimeSpan.FromDays(30)
        });
        return new JwtTokenIssuer(options);
    }

    [Fact]
    public void IssueAccessToken_includes_user_id_and_role_claims()
    {
        var issuer = CreateIssuer();
        var user = new DodostaysUser
        {
            Id = Guid.NewGuid(),
            Email = "x@y.com",
            DisplayName = "X",
            Role = UserRole.Host,
            PreferredLanguage = "fr"
        };

        var (token, expiresAt) = issuer.IssueAccessToken(user);

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
        jwt.Claims.Should().Contain(c => c.Type == "sub" && c.Value == user.Id.ToString());
        jwt.Claims.Should().Contain(c => c.Type == "role" && c.Value == "Host");
        jwt.Claims.Should().Contain(c => c.Type == "email" && c.Value == "x@y.com");
        expiresAt.Should().BeCloseTo(DateTimeOffset.UtcNow.AddMinutes(15), TimeSpan.FromSeconds(5));
    }

    [Fact]
    public void IssueRefreshToken_returns_random_string_and_hash()
    {
        var issuer = CreateIssuer();

        var (raw1, hash1) = issuer.IssueRefreshToken();
        var (raw2, hash2) = issuer.IssueRefreshToken();

        raw1.Should().NotBe(raw2);
        hash1.Should().NotBe(hash2);
        issuer.HashRefreshToken(raw1).Should().Be(hash1);
        issuer.HashRefreshToken(raw2).Should().Be(hash2);
    }
}
