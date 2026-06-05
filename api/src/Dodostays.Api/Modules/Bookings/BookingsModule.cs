using FluentValidation;
using Dodostays.Api.Contracts.Bookings;
using Dodostays.Api.Modules.Bookings.Endpoints;
using Dodostays.Api.Modules.Bookings.Hangfire;
using Dodostays.Api.Modules.Bookings.Ical;
using Dodostays.Api.Modules.Bookings.Services;
using Dodostays.Api.Modules.Bookings.Validation;

namespace Dodostays.Api.Modules.Bookings;

public static class BookingsModule
{
    public static IServiceCollection AddBookingsModule(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddHangfireWithPostgres(configuration);

        services.Configure<IcalOptions>(configuration.GetSection("Ical"));
        services.AddHttpClient<IIcalFeedFetcher, HttpIcalFeedFetcher>();
        services.AddSingleton<IcalFeedParser>();
        services.AddSingleton<IcalFeedEmitter>();
        services.AddSingleton<SignedIcalUrlGenerator>();
        services.AddScoped<IcalSyncJob>();
        services.AddScoped<IValidator<AddExternalFeedRequest>, AddExternalFeedValidator>();

        services.AddScoped<PricingService>();
        services.AddScoped<AvailabilityService>();
        services.AddScoped<BookingHoldService>();
        services.AddScoped<BookingService>();
        services.AddScoped<CalendarService>();

        services.AddScoped<IValidator<HoldBookingRequest>, HoldBookingValidator>();
        services.AddScoped<IValidator<AvailabilityRequest>, AvailabilityRequestValidator>();

        return services;
    }

    public static IEndpointRouteBuilder MapBookingsEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapHoldBooking();
        app.MapConfirmBooking();
        app.MapGetMyBookings();
        app.MapGetListingBookings();
        app.MapCancelBooking();
        app.MapCheckInBooking();
        app.MapGetAvailability();
        app.MapGetCalendar();
        app.MapAddExternalFeed();
        app.MapRemoveExternalFeed();
        app.MapListExternalFeeds();
        app.MapGetIcalFeed();
        app.MapGetMyIcalUrl();
        return app;
    }
}
