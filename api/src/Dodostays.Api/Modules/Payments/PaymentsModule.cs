namespace Dodostays.Api.Modules.Payments;

/// <summary>
/// Payments module composition root. Currently a stub — services and endpoints land in
/// Plan 04 Tasks 4.2 through 4.9.
/// </summary>
public static class PaymentsModule
{
    public static IServiceCollection AddPaymentsModule(this IServiceCollection services, IConfiguration configuration)
    {
        // Tasks 4.2–4.6 will register IPaymentProcessor, IPayoutProcessor, IFxRateProvider,
        // IInvoiceGenerator, IEmailSender, IIdempotencyService, etc. here, driven by the
        // "Payments", "Payouts", "Fx", "Email" and "Invoicing" config sections.
        _ = configuration;
        return services;
    }

    public static IEndpointRouteBuilder MapPaymentsEndpoints(this IEndpointRouteBuilder app)
    {
        // Task 4.9 will map GET /api/bookings/{id} and GET /api/bookings/{id}/invoice here.
        return app;
    }
}
