using FluentValidation;
using Dodostays.Api.Contracts.Search;
using Dodostays.Api.Modules.Search.DriveTime;
using Dodostays.Api.Modules.Search.Endpoints;
using Dodostays.Api.Modules.Search.Parsers;
using Dodostays.Api.Modules.Search.Services;
using Dodostays.Api.Modules.Search.Validation;

namespace Dodostays.Api.Modules.Search;

public static class SearchModule
{
    public static IServiceCollection AddSearchModule(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<NlParserOptions>(configuration.GetSection("NlParser"));
        services.Configure<DriveTimeOptions>(configuration.GetSection("DriveTime"));
        services.AddDistributedMemoryCache();

        services.AddSingleton<InMemoryListingNlParser>();
        var nlProvider = configuration["NlParser:Provider"] ?? "InMemory";
        if (string.Equals(nlProvider, "Claude", StringComparison.OrdinalIgnoreCase))
            services.AddSingleton<IListingNlParser, ClaudeListingNlParser>();
        else
            services.AddSingleton<IListingNlParser>(sp => sp.GetRequiredService<InMemoryListingNlParser>());

        services.AddSingleton<NlParseCache>();

        var driveProvider = configuration["DriveTime:Provider"] ?? "Haversine";
        if (string.Equals(driveProvider, "Mapbox", StringComparison.OrdinalIgnoreCase))
            services.AddHttpClient<IDriveTimeService, MapboxDriveTimeService>();
        else
            services.AddSingleton<IDriveTimeService, HaversineDriveTimeService>();

        services.AddScoped<SearchOrchestrator>();
        services.AddScoped<IValidator<SearchParseRequest>, SearchParseRequestValidator>();

        return services;
    }

    public static IEndpointRouteBuilder MapSearchEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapParseSearch();
        return app;
    }
}
