using FluentValidation;
using Dodostays.Api.Contracts.Bookings;
using Dodostays.Api.Modules.Bookings.Endpoints;
using Dodostays.Api.Modules.Bookings.Services;
using Dodostays.Api.Modules.Bookings.Validation;

namespace Dodostays.Api.Modules.Bookings;

public static class BookingsModule
{
    public static IServiceCollection AddBookingsModule(this IServiceCollection services, IConfiguration configuration)
    {
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
        return app;
    }
}
