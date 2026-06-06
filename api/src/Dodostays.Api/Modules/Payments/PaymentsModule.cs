using Dodostays.Api.Modules.Payments.Processing;

namespace Dodostays.Api.Modules.Payments;

/// <summary>
/// Payments module composition root. Currently a stub — services and endpoints land in
/// Plan 04 Tasks 4.2 through 4.9.
/// </summary>
public static class PaymentsModule
{
    public static IServiceCollection AddPaymentsModule(this IServiceCollection services, IConfiguration configuration)
    {
        // Task 4.2: Payment processor abstraction + InMemory impl + MIPS skeleton
        services.Configure<PaymentOptions>(configuration.GetSection(PaymentOptions.SectionName));
        var paymentProvider = configuration[$"{PaymentOptions.SectionName}:Provider"] ?? "InMemory";
        if (string.Equals(paymentProvider, "Mips", StringComparison.OrdinalIgnoreCase))
            services.AddHttpClient<IPaymentProcessor, MipsPaymentProcessor>();
        else if (string.Equals(paymentProvider, "InMemory", StringComparison.OrdinalIgnoreCase))
            services.AddSingleton<IPaymentProcessor, InMemoryPaymentProcessor>();
        else
            throw new InvalidOperationException($"Unknown Payments:Provider value: {paymentProvider}");

        // Tasks 4.3–4.6 will register IPayoutProcessor, IFxRateProvider, IInvoiceGenerator,
        // IEmailSender, IIdempotencyService, etc. here, driven by the "Payouts", "Fx",
        // "Email" and "Invoicing" config sections.
        return services;
    }

    public static IEndpointRouteBuilder MapPaymentsEndpoints(this IEndpointRouteBuilder app)
    {
        // Task 4.9 will map GET /api/bookings/{id} and GET /api/bookings/{id}/invoice here.
        return app;
    }
}
