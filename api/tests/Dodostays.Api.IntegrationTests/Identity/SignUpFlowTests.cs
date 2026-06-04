using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Http;
using Xunit;
using FluentAssertions;
using Dodostays.Api.Contracts.Identity;

namespace Dodostays.Api.IntegrationTests.Identity;

public class SignUpFlowTests : IClassFixture<PostgresFixture>
{
    private readonly PostgresFixture _fx;

    public SignUpFlowTests(PostgresFixture fx) => _fx = fx;

    [Fact]
    public async Task SignUp_creates_user_and_returns_token()
    {
        using var factory = _fx.CreateFactory();
        var client = factory.CreateClient();

        var email = $"signup-{Guid.NewGuid():N}@test.dodostays.local";
        var req = new SignUpRequest(email, "Aa1!aaaaaa", "Test User", "en", UserRole.Guest);

        var res = await client.PostAsJsonAsync("/api/identity/signup", req);

        res.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await res.Content.ReadFromJsonAsync<AuthResponse>();
        body.Should().NotBeNull();
        body!.AccessToken.Should().NotBeNullOrEmpty();
        body.User.Email.Should().Be(email);
        body.User.Role.Should().Be(UserRole.Guest);
        body.User.KycStatus.Should().Be(KycStatus.Verified); // InMemory verifier auto-approves
        var setCookies = res.Headers.TryGetValues("Set-Cookie", out var cookies) ? cookies.ToList() : new List<string>();
        setCookies.Should().Contain(c => c.StartsWith("ds_rt="));
    }

    [Fact]
    public async Task SignUp_rejects_admin_role_attempts()
    {
        using var factory = _fx.CreateFactory();
        var client = factory.CreateClient();

        var req = new SignUpRequest($"admin-{Guid.NewGuid():N}@x.com", "Aa1!aaaaaa", "Bad", "en", UserRole.Admin);

        var res = await client.PostAsJsonAsync("/api/identity/signup", req);

        res.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task SignUp_rejects_duplicate_email()
    {
        using var factory = _fx.CreateFactory();
        var client = factory.CreateClient();
        var email = $"dup-{Guid.NewGuid():N}@test.dodostays.local";
        var req = new SignUpRequest(email, "Aa1!aaaaaa", "Dup", "en", UserRole.Guest);

        (await client.PostAsJsonAsync("/api/identity/signup", req)).StatusCode.Should().Be(HttpStatusCode.OK);
        var res = await client.PostAsJsonAsync("/api/identity/signup", req);

        ((int)res.StatusCode).Should().Be(StatusCodes.Status409Conflict);
    }
}
