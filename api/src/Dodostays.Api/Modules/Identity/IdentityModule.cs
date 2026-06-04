using Microsoft.AspNetCore.Identity;
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Modules.Common.Database;
using Dodostays.Api.Modules.Identity.Auth;
using Dodostays.Api.Modules.Identity.Domain;
using Dodostays.Api.Modules.Identity.Kyc;
using Dodostays.Api.Modules.Identity.Services;

namespace Dodostays.Api.Modules.Identity;

public static class IdentityModule
{
    public static IServiceCollection AddIdentityModule(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddIdentityCore<DodostaysUser>(opts =>
            {
                opts.Password.RequireDigit = true;
                opts.Password.RequireLowercase = true;
                opts.Password.RequireUppercase = true;
                opts.Password.RequiredLength = 10;
                opts.User.RequireUniqueEmail = true;
            })
            .AddRoles<DodostaysRole>()
            .AddEntityFrameworkStores<DodostaysDbContext>()
            .AddDefaultTokenProviders();

        services.AddDodostaysJwtAuth(configuration);

        services.Configure<KycOptions>(configuration.GetSection("Kyc"));
        var kycProvider = configuration["Kyc:Provider"] ?? "InMemory";
        if (string.Equals(kycProvider, "Onfido", StringComparison.OrdinalIgnoreCase))
        {
            services.AddHttpClient<IKycVerifier, OnfidoKycVerifier>();
        }
        else
        {
            services.AddSingleton<IKycVerifier, InMemoryKycVerifier>();
        }

        services.AddHttpContextAccessor();
        services.AddScoped<IUserContext, UserContext>();

        return services;
    }

    public static IEndpointRouteBuilder MapIdentityEndpoints(this IEndpointRouteBuilder app)
    {
        // Endpoints registered in Tasks 1.8-1.10. Module wiring keeps a single mount point.
        return app;
    }
}
