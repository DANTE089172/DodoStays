using Dodostays.Api.Contracts.Payments;
using Microsoft.Extensions.Options;

namespace Dodostays.Api.Modules.Payments.Processing;

public sealed class MipsPaymentProcessor : IPaymentProcessor
{
    private readonly HttpClient _http;
    private readonly PaymentOptions _options;
    private readonly ILogger<MipsPaymentProcessor> _logger;

    public MipsPaymentProcessor(HttpClient http, IOptions<PaymentOptions> options, ILogger<MipsPaymentProcessor> logger)
    {
        _http = http;
        _options = options.Value;
        _logger = logger;

        if (string.IsNullOrWhiteSpace(_options.MipsApiKey))
            throw new InvalidOperationException("Payments:MipsApiKey is required when provider is Mips.");
        if (string.IsNullOrWhiteSpace(_options.MipsBaseUrl))
            throw new InvalidOperationException("Payments:MipsBaseUrl is required when provider is Mips.");
        if (string.IsNullOrWhiteSpace(_options.MipsMerchantId))
            throw new InvalidOperationException("Payments:MipsMerchantId is required when provider is Mips.");

        _http.BaseAddress = new Uri(_options.MipsBaseUrl);
        _http.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _options.MipsApiKey);
    }

    public string ProcessorId => "Mips";

    public Task<PaymentReceiptDto> AuthorizeAndCaptureAsync(
        Guid bookingId,
        decimal amountMur,
        string idempotencyKey,
        CancellationToken ct)
    {
        // Real MIPS integration is deferred to Plan 04 v2 until merchant account exists.
        // For now, calling this throws — production config must use InMemory until then.
        throw new NotImplementedException("MIPS integration not yet wired — Plan 04 v2 deferred until merchant account exists");
    }
}
