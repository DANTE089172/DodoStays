using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Xunit;
using FluentAssertions;
using Dodostays.Api.Contracts.Identity;

namespace Dodostays.Api.IntegrationTests.Identity;

public class MeEndpointTests : IClassFixture<PostgresFixture>
{
    private readonly PostgresFixture _fx;

    public MeEndpointTests(PostgresFixture fx) => _fx = fx;

    [Fact]
    public async Task Me_returns_current_user_with_valid_token()
    {
        using var factory = _fx.CreateFactory();
        var client = factory.CreateClient();

        var email = $"me-{Guid.NewGuid():N}@test.dodostays.local";
        var signup = await client.PostAsJsonAsync("/api/identity/signup",
            new SignUpRequest(email, "Aa1!aaaaaa", "Me Test", "en", UserRole.Guest));
        var auth = await signup.Content.ReadFromJsonAsync<AuthResponse>();

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.AccessToken);
        var res = await client.GetAsync("/api/identity/me");

        res.StatusCode.Should().Be(HttpStatusCode.OK);
        var user = await res.Content.ReadFromJsonAsync<UserDto>();
        user!.Email.Should().Be(email);
    }

    [Fact]
    public async Task Me_returns_401_without_token()
    {
        using var factory = _fx.CreateFactory();
        var client = factory.CreateClient();

        var res = await client.GetAsync("/api/identity/me");

        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
