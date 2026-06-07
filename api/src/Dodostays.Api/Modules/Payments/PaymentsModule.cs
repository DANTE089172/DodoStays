using Dodostays.Api.Modules.Payments.Processing;
using Dodostays.Api.Modules.Payments.Idempotency;
using Dodostays.Api.Modules.Payments.Endpoints;

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

        // Task 4.5: Invoice generation (QuestPDF)
        // QuestPDF Community licence — free for companies under $1M USD revenue
        QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;
        services.Configure<Invoices.InvoicingOptions>(configuration.GetSection(Invoices.InvoicingOptions.SectionName));
        services.AddScoped<Invoices.IInvoiceSequenceService, Invoices.InvoiceSequenceService>();
        services.AddScoped<Invoices.IInvoicePdfStorage, Invoices.LocalDiskInvoicePdfStorage>();
        services.AddScoped<Invoices.IInvoiceGenerator, Invoices.QuestPdfInvoiceGenerator>();

        // Task 4.6: Email sender
        services.Configure<Email.EmailOptions>(configuration.GetSection(Email.EmailOptions.SectionName));
        var emailProvider = configuration.GetSection(Email.EmailOptions.SectionName).GetValue<string>("Provider") ?? "Log";
        switch (emailProvider)
        {
            case "Log":
                services.AddSingleton<Email.IEmailSender, Email.LogEmailSender>();
                break;
            case "Resend":
                services.AddSingleton<Email.IEmailSender, Email.ResendEmailSender>();
                break;
            default:
                throw new InvalidOperationException($"Unknown Email:Provider value: {emailProvider}");
        }

        // Task 4.6: SMS sender
        services.Configure<Sms.SmsOptions>(configuration.GetSection(Sms.SmsOptions.SectionName));
        var smsProvider = configuration.GetSection(Sms.SmsOptions.SectionName).GetValue<string>("Provider") ?? "Log";
        switch (smsProvider)
        {
            case "Log":
                services.AddSingleton<Sms.ISmsSender, Sms.LogSmsSender>();
                break;
            case "Twilio":
                services.AddSingleton<Sms.ISmsSender, Sms.TwilioSmsSender>();
                break;
            default:
                throw new InvalidOperationException($"Unknown Sms:Provider value: {smsProvider}");
        }

        // Task 4.8: Payouts
        services.Configure<Payouts.PayoutOptions>(configuration.GetSection(Payouts.PayoutOptions.SectionName));
        var payoutProvider = configuration.GetSection(Payouts.PayoutOptions.SectionName).GetValue<string>("Provider") ?? "InMemory";
        switch (payoutProvider)
        {
            case "InMemory":
                services.AddSingleton<Payouts.IPayoutProcessor, Payouts.InMemoryPayoutProcessor>();
                break;
            case "Wise":
                services.AddSingleton<Payouts.IPayoutProcessor, Payouts.WisePayoutProcessor>();
                break;
            default:
                throw new InvalidOperationException($"Unknown Payouts:Provider value: {payoutProvider}");
        }
        services.AddScoped<Payouts.BookingPayoutJob>();

        return services;
    }

    public static IEndpointRouteBuilder MapPaymentsEndpoints(this IEndpointRouteBuilder app)
    {
        // Task 4.9: Invoice download endpoint
        app.MapGetBookingInvoice();
        return app;
    }
}
