using Microsoft.EntityFrameworkCore;
using Testcontainers.PostgreSql;
using Dodostays.Api.Modules.Common.Database;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Dodostays.Api.IntegrationTests;

public sealed class PostgresFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder()
        .WithImage("postgis/postgis:16-3.4")
        .WithDatabase("dodostays_test")
        .WithUsername("dodostays_test")
        .WithPassword("dodostays_test")
        .Build();

    public string ConnectionString => _container.GetConnectionString();

    public WebApplicationFactory<Program> CreateFactory() =>
        new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseSetting("ConnectionStrings:Postgres", ConnectionString);
        });

    public async Task InitializeAsync()
    {
        await _container.StartAsync();

        var options = new DbContextOptionsBuilder<DodostaysDbContext>()
            .UseNpgsql(ConnectionString, npg => npg.UseNetTopologySuite())
            .Options;
        await using var db = new DodostaysDbContext(options);
        await db.Database.MigrateAsync();
    }

    public async Task DisposeAsync() => await _container.DisposeAsync();
}
