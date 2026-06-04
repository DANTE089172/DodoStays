using System.Net;
using System.Net.Http.Json;
using Xunit;
using FluentAssertions;
using Dodostays.Api.Contracts.Identity;

namespace Dodostays.Api.IntegrationTests.Identity;

public class SignInFlowTests : IClassFixture<PostgresFixture>
{
    private readonly PostgresFixture _fx;

    public SignInFlowTests(PostgresFixture fx) => _fx = fx;

    [Fact]
    public async Task SignIn_succeeds_with_correct_password()
    {
        using var factory = _fx.CreateFactory();
        var client = factory.CreateClient();

        var email = $"signin-{Guid.NewGuid():N}@test.dodostays.local";
        var password = "Aa1!aaaaaa";
        await client.PostAsJsonAsync("/api/identity/signup",
            new SignUpRequest(email, password, "Test", "en", UserRole.Guest));

        var res = await client.PostAsJsonAsync("/api/identity/signin",
            new SignInRequest(email, password));

        res.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await res.Content.ReadFromJsonAsync<AuthResponse>();
        body!.AccessToken.Should().NotBeNullOrEmpty();
        body.User.Email.Should().Be(email);
    }

    [Fact]
    public async Task SignIn_returns_401_on_wrong_password()
    {
        using var factory = _fx.CreateFactory();
        var client = factory.CreateClient();

        var email = $"signin-fail-{Guid.NewGuid():N}@test.dodostays.local";
        await client.PostAsJsonAsync("/api/identity/signup",
            new SignUpRequest(email, "Aa1!aaaaaa", "Test", "en", UserRole.Guest));

        var res = await client.PostAsJsonAsync("/api/identity/signin",
            new SignInRequest(email, "WrongPass1!"));

        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
