using FluentValidation;
using Dodostays.Api.Contracts.Listings;
using Dodostays.Api.Modules.Listings.Endpoints;
using Dodostays.Api.Modules.Listings.Services;
using Dodostays.Api.Modules.Listings.Storage;
using Dodostays.Api.Modules.Listings.Validation;

namespace Dodostays.Api.Modules.Listings;

public static class ListingsModule
{
    public static IServiceCollection AddListingsModule(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<PhotoStorageOptions>(configuration.GetSection("PhotoStorage"));
        var provider = configuration["PhotoStorage:Provider"] ?? "Local";
        if (string.Equals(provider, "R2", StringComparison.OrdinalIgnoreCase))
            services.AddSingleton<IPhotoStorage, R2PhotoStorage>();
        else
            services.AddSingleton<IPhotoStorage, LocalFilesystemPhotoStorage>();

        services.AddScoped<ListingService>();
        services.AddScoped<ListingSearchService>();

        services.AddScoped<IValidator<CreateListingRequest>, CreateListingValidator>();
        services.AddScoped<IValidator<UpdateListingRequest>, UpdateListingValidator>();
        services.AddScoped<IValidator<ListingSearchRequest>, ListingSearchValidator>();

        return services;
    }

    public static IEndpointRouteBuilder MapListingsEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapCreateListing();
        app.MapUpdateListing();
        app.MapDeleteListing();
        app.MapPublishListing();
        app.MapUnpublishListing();
        app.MapUploadPhoto();
        app.MapDeletePhoto();
        app.MapGetMyListings();
        app.MapGetListing();
        app.MapSearchListings();
        return app;
    }
}
