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

                // Strip Hangfire registrations so unit tests don't need a real Postgres for Hangfire storage init.
                static bool IsHangfire(string? name) =>
                    !string.IsNullOrEmpty(name) && name.StartsWith("Hangfire", StringComparison.Ordinal);
                var hangfireDescriptors = services
                    .Where(s => IsHangfire(s.ServiceType.FullName)
                        || IsHangfire(s.ImplementationType?.FullName)
                        || IsHangfire(s.ImplementationInstance?.GetType().FullName)
                        || IsHangfire(s.ImplementationFactory?.Method.DeclaringType?.FullName))
                    .ToList();
                foreach (var d in hangfireDescriptors) services.Remove(d);
            });
            builder.UseSetting("ConnectionStrings:Postgres", "Host=ignored;Database=ignored;Username=ignored;Password=ignored");
            builder.UseSetting("Hangfire:DashboardEnabled", "false");
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
