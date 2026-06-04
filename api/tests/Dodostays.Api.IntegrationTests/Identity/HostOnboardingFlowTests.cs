using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Xunit;
using FluentAssertions;
using Dodostays.Api.Contracts.Identity;

namespace Dodostays.Api.IntegrationTests.Identity;

public class HostOnboardingFlowTests : IClassFixture<PostgresFixture>
{
    private readonly PostgresFixture _fx;

    public HostOnboardingFlowTests(PostgresFixture fx) => _fx = fx;

    [Fact]
    public async Task Upsert_then_get_round_trips_profile()
    {
        using var factory = _fx.CreateFactory();
        var client = factory.CreateClient();

        var email = $"host-{Guid.NewGuid():N}@test.dodostays.local";
        var signup = await client.PostAsJsonAsync("/api/identity/signup",
            new SignUpRequest(email, "Aa1!aaaaaa", "Host Test", "fr", UserRole.Host));
        var auth = await signup.Content.ReadFromJsonAsync<AuthResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.AccessToken);

        var dto = new HostProfileDto(
            UserId: Guid.Empty, // will be overwritten by endpoint
            LegalName: "Mauritius Beach Villas Ltd",
            TamLicenseNumber: "TAM/2024/77777",
            VatNumber: "VAT22222222",
            BankAccountLast4: "9876",
            BankName: "MCB");

        var put = await client.PutAsJsonAsync("/api/identity/host-profile", dto);
        put.StatusCode.Should().Be(HttpStatusCode.OK);
        var saved = await put.Content.ReadFromJsonAsync<HostProfileDto>();
        saved!.UserId.Should().Be(auth.User.Id);
        saved.TamLicenseNumber.Should().Be("TAM/2024/77777");

        var get = await client.GetAsync("/api/identity/host-profile");
        get.StatusCode.Should().Be(HttpStatusCode.OK);
        var fetched = await get.Content.ReadFromJsonAsync<HostProfileDto>();
        fetched!.LegalName.Should().Be("Mauritius Beach Villas Ltd");
    }

    [Fact]
    public async Task Get_returns_404_when_no_profile_yet()
    {
        using var factory = _fx.CreateFactory();
        var client = factory.CreateClient();

        var email = $"noprofile-{Guid.NewGuid():N}@test.dodostays.local";
        var signup = await client.PostAsJsonAsync("/api/identity/signup",
            new SignUpRequest(email, "Aa1!aaaaaa", "Test", "en", UserRole.Guest));
        var auth = await signup.Content.ReadFromJsonAsync<AuthResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.AccessToken);

        var res = await client.GetAsync("/api/identity/host-profile");
        res.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
