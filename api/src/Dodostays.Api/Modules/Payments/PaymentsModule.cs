using Dodostays.Api.Modules.Payments.Processing;
using Dodostays.Api.Modules.Payments.Idempotency;

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

        // Task 4.4: FX rate provider abstraction + Fixed impl
        services.Configure<Fx.FxOptions>(configuration.GetSection(Fx.FxOptions.SectionName));
        // TODO: Plan 06 — branch on FxOptions.Provider once OpenExchangeRatesFxProvider exists
        services.AddSingleton<Fx.IFxRateProvider, Fx.FixedFxRateProvider>();

        // Task 4.3: Idempotency service + DB store
        services.AddScoped<IIdempotencyStore, DbIdempotencyStore>();
        services.AddScoped<IIdempotencyService, IdempotencyService>();

        // Tasks 4.5–4.6 will register IPayoutProcessor, IInvoiceGenerator,
        // IEmailSender, etc. here, driven by the "Payouts", "Email" and "Invoicing"
        // config sections.
        return services;
    }

    public static IEndpointRouteBuilder MapPaymentsEndpoints(this IEndpointRouteBuilder app)
    {
        // Task 4.9 will map GET /api/bookings/{id} and GET /api/bookings/{id}/invoice here.
        return app;
    }
}
