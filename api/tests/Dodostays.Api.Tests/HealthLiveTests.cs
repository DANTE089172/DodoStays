using System.Net;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Modules.Common.Database;
using Xunit;

namespace Dodostays.Api.Tests;

public class HealthLiveTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public HealthLiveTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                var descriptor = services.Single(s => s.ServiceType == typeof(DbContextOptions<DodostaysDbContext>));
                services.Remove(descriptor);
                services.AddDbContext<DodostaysDbContext>(opts => opts.UseInMemoryDatabase("hl-test"));
            });
            builder.UseSetting("ConnectionStrings:Postgres", "Host=ignored;Database=ignored;Username=ignored;Password=ignored");
        });
    }

    [Fact]
    public async Task Live_returns_ok()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/health/live");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
