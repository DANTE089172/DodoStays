using System.Net;
using FluentAssertions;
using Xunit;

namespace Dodostays.Api.IntegrationTests;

public class HealthReadyTests : IClassFixture<PostgresFixture>
{
    private readonly PostgresFixture _fx;

    public HealthReadyTests(PostgresFixture fx) => _fx = fx;

    [Fact]
    public async Task Ready_returns_ok_when_database_reachable()
    {
        using var factory = _fx.CreateFactory();
        var client = factory.CreateClient();

        var response = await client.GetAsync("/health/ready");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
