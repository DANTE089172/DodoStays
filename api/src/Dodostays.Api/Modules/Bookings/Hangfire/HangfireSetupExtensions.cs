using global::Hangfire;
using global::Hangfire.PostgreSql;
using Microsoft.Extensions.Options;

namespace Dodostays.Api.Modules.Bookings.Hangfire;

public static class HangfireSetupExtensions
{
    public static IServiceCollection AddHangfireWithPostgres(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<HangfireOptions>(configuration.GetSection("Hangfire"));

        var connectionString = configuration.GetConnectionString("Postgres")
            ?? throw new InvalidOperationException("ConnectionStrings:Postgres is required for Hangfire.");

        services.AddHangfire(cfg => cfg
            .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
            .UseSimpleAssemblyNameTypeSerializer()
            .UseRecommendedSerializerSettings()
            .UsePostgreSqlStorage(opts => opts.UseNpgsqlConnection(connectionString)));

        services.AddHangfireServer();
        services.AddSingleton<AdminAuthorizationFilter>();

        return services;
    }

    public static IApplicationBuilder UseHangfireDashboardIfEnabled(this WebApplication app)
    {
        var opts = app.Services.GetRequiredService<IOptions<HangfireOptions>>().Value;
        if (!opts.DashboardEnabled) return app;

        var filter = app.Services.GetRequiredService<AdminAuthorizationFilter>();
        app.UseHangfireDashboard(opts.DashboardPath, new DashboardOptions
        {
            Authorization = new[] { filter },
            DisplayStorageConnectionString = false,
            DisplayNameFunc = (_, job) => job.ToString()
        });
        return app;
    }
}
