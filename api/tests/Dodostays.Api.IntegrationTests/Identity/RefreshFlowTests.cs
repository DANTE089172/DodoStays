using System.Net;
using System.Net.Http.Json;
using Xunit;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Dodostays.Api.Contracts.Identity;

namespace Dodostays.Api.IntegrationTests.Identity;

public class RefreshFlowTests : IClassFixture<PostgresFixture>
{
    private readonly PostgresFixture _fx;

    public RefreshFlowTests(PostgresFixture fx) => _fx = fx;

    [Fact]
    public async Task Refresh_with_cookie_returns_new_access_token()
    {
        using var factory = _fx.CreateFactory();
        var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            HandleCookies = true
        });

        var email = $"refresh-{Guid.NewGuid():N}@test.dodostays.local";
        var signupRes = await client.PostAsJsonAsync("/api/identity/signup",
            new SignUpRequest(email, "Aa1!aaaaaa", "Test", "en", UserRole.Guest));
        signupRes.StatusCode.Should().Be(HttpStatusCode.OK);

        var refreshRes = await client.PostAsync("/api/identity/refresh", null);

        refreshRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await refreshRes.Content.ReadFromJsonAsync<AuthResponse>();
        body!.AccessToken.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Refresh_returns_401_without_cookie()
    {
        using var factory = _fx.CreateFactory();
        var client = factory.CreateClient();

        var res = await client.PostAsync("/api/identity/refresh", null);

        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
