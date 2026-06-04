using System.Text.Json;
using System.Text.Json.Serialization;
using Anthropic.SDK;
using Anthropic.SDK.Messaging;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Dodostays.Api.Contracts.Listings;
using Dodostays.Api.Contracts.Search;

namespace Dodostays.Api.Modules.Search.Parsers;

public sealed class ClaudeListingNlParser : IListingNlParser
{
    private readonly NlParserOptions _options;
    private readonly ILogger<ClaudeListingNlParser> _logger;
    private readonly InMemoryListingNlParser _fallback;
    private readonly AnthropicClient _client;

    public ClaudeListingNlParser(
        IOptions<NlParserOptions> options,
        ILogger<ClaudeListingNlParser> logger,
        InMemoryListingNlParser fallback)
    {
        _options = options.Value;
        _logger = logger;
        _fallback = fallback;
        if (string.IsNullOrWhiteSpace(_options.AnthropicApiKey))
            throw new InvalidOperationException("NlParser:AnthropicApiKey is required when provider is Claude.");
        _client = new AnthropicClient(_options.AnthropicApiKey);
    }

    public async Task<NlParseResult> ParseAsync(string text, ParsedFilters? currentFilters, CancellationToken ct)
    {
        try
        {
            var system = SystemPrompt();
            var userMsg = BuildUserMessage(text, currentFilters);

            var parameters = new MessageParameters
            {
                Messages = new List<Message>
                {
                    new() { Role = RoleType.User, Content = new List<ContentBase> { new TextContent { Text = userMsg } } }
                },
                MaxTokens = _options.MaxTokens,
                Model = _options.AnthropicModel,
                System = new List<SystemMessage> { new(system) },
                Stream = false,
                Temperature = 0.0m
            };

            var response = await _client.Messages.GetClaudeMessageAsync(parameters, ct);
            var jsonText = ExtractJson(response?.Message?.ToString() ?? string.Empty);
            var dto = JsonSerializer.Deserialize<ClaudeReply>(jsonText, JsonOpts);
            if (dto is null) throw new InvalidOperationException("Empty Claude reply.");

            var filters = new ParsedFilters(
                Region: dto.Region,
                PropertyType: dto.PropertyType,
                MinBedrooms: dto.MinBedrooms,
                MinGuests: dto.MinGuests,
                MaxNightlyMur: dto.MaxNightlyMur,
                MinNightlyMur: dto.MinNightlyMur,
                RequiredAmenities: (IReadOnlyList<Amenity>?)dto.RequiredAmenities ?? Array.Empty<Amenity>(),
                CheckIn: dto.CheckIn,
                CheckOut: dto.CheckOut,
                VerifiedOnly: dto.VerifiedOnly,
                UnknownTokens: (IReadOnlyList<string>?)dto.UnknownTokens ?? Array.Empty<string>());
            return new NlParseResult(filters, dto.Confidence, dto.Acknowledgement ?? "");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Claude NL parse failed; falling back to InMemory parser");
            return await _fallback.ParseAsync(text, currentFilters, ct);
        }
    }

    private static string SystemPrompt() => """
        You are a search filter extractor for DodoStays — a Mauritius short-term rental marketplace.
        Given a user's free-text search query, return STRICT JSON with these fields:

        {
          "region": one of [grand-baie, flic-en-flac, tamarin, trou-aux-biches, pereybere, belle-mare, le-morne, blue-bay, albion] or null,
          "propertyType": "Villa" | "Apartment" | "Guesthouse" | null,
          "minBedrooms": int or null,
          "minGuests": int or null,
          "maxNightlyMur": decimal or null (in MUR; convert from EUR ~50, USD ~45, INR ~0.55 if needed),
          "minNightlyMur": decimal or null,
          "requiredAmenities": array of [Pool, BeachAccess, AirCon, Wifi, Kitchen, Parking, Tv, WashingMachine, Balcony, Garden, Bbq, Generator],
          "checkIn": ISO 8601 date or null,
          "checkOut": ISO 8601 date or null,
          "verifiedOnly": bool,
          "confidence": float 0.0-1.0,
          "acknowledgement": short string echoing parsed intent in plain English (max 120 chars),
          "unknownTokens": array of strings the model could not map
        }

        OUTPUT JSON ONLY. No prose, no code fences.
        If query is ambiguous or empty, set confidence < 0.5 and unknownTokens accordingly.
        """;

    private static string BuildUserMessage(string text, ParsedFilters? current)
    {
        if (current is null) return $"User query: \"{text}\"";
        var json = JsonSerializer.Serialize(current, JsonOpts);
        return $"Current filters: {json}\nUser refinement: \"{text}\"\nMerge — keep current values unless overridden.";
    }

    private static string ExtractJson(string s)
    {
        var start = s.IndexOf('{');
        var end = s.LastIndexOf('}');
        return (start < 0 || end <= start) ? s : s.Substring(start, end - start + 1);
    }

    private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    private sealed class ClaudeReply
    {
        public string? Region { get; set; }
        public PropertyType? PropertyType { get; set; }
        public int? MinBedrooms { get; set; }
        public int? MinGuests { get; set; }
        public decimal? MaxNightlyMur { get; set; }
        public decimal? MinNightlyMur { get; set; }
        public List<Amenity>? RequiredAmenities { get; set; }
        public DateTimeOffset? CheckIn { get; set; }
        public DateTimeOffset? CheckOut { get; set; }
        public bool VerifiedOnly { get; set; }
        public double Confidence { get; set; } = 0.5;
        public string? Acknowledgement { get; set; }
        public List<string>? UnknownTokens { get; set; }
    }
}
