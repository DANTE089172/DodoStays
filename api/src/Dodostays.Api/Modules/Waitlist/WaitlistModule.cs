using FluentValidation;
using Dodostays.Api.Contracts.Waitlist;
using Dodostays.Api.Modules.Waitlist.Endpoints;
using Dodostays.Api.Modules.Waitlist.Services;
using Dodostays.Api.Modules.Waitlist.Validation;

namespace Dodostays.Api.Modules.Waitlist;

public static class WaitlistModule
{
    public static IServiceCollection AddWaitlistModule(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddScoped<WaitlistService>();
        services.AddScoped<IValidator<JoinWaitlistRequest>, JoinWaitlistValidator>();
        return services;
    }

    public static IEndpointRouteBuilder MapWaitlistEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapJoinWaitlist();
        app.MapGetWaitlistStats();
        return app;
    }
}
