using Dodostays.Api.Contracts.Identity;
using Microsoft.Extensions.Options;

namespace Dodostays.Api.Modules.Identity.Kyc;

public sealed class OnfidoKycVerifier : IKycVerifier
{
    private readonly HttpClient _http;
    private readonly KycOptions _options;

    public OnfidoKycVerifier(HttpClient http, IOptions<KycOptions> options)
    {
        _http = http;
        _options = options.Value;
        if (string.IsNullOrWhiteSpace(_options.OnfidoApiKey))
            throw new InvalidOperationException("Kyc:OnfidoApiKey is required when provider is Onfido.");
        _http.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Token", $"token={_options.OnfidoApiKey}");
    }

    public string VerifierId => "onfido";

    public Task<KycVerificationResult> StartAsync(Guid userId, string email, string displayName, CancellationToken ct)
    {
        // Real Onfido SDK integration is deferred to launch readiness work.
        // For now, calling this throws — production config must use InMemory until then.
        throw new NotImplementedException("Onfido integration is wired but not yet implemented. Use Kyc:Provider=InMemory until launch readiness work completes.");
    }
}
