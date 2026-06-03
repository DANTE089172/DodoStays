using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace Dodostays.Api.Modules.Common.Database;

public sealed class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<DodostaysDbContext>
{
    public DodostaysDbContext CreateDbContext(string[] args)
    {
        var configuration = new ConfigurationBuilder()
            .AddJsonFile("appsettings.json", optional: false)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        var connectionString = configuration.GetConnectionString("Postgres")
            ?? throw new InvalidOperationException("ConnectionStrings:Postgres is not set.");

        var options = new DbContextOptionsBuilder<DodostaysDbContext>()
            .UseNpgsql(connectionString, npg => npg.UseNetTopologySuite())
            .Options;

        return new DodostaysDbContext(options);
    }
}
