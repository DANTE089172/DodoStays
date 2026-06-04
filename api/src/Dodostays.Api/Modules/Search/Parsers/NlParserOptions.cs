namespace Dodostays.Api.Modules.Search.Parsers;

public sealed class NlParserOptions
{
    public string Provider { get; set; } = "InMemory";
    public string? AnthropicApiKey { get; set; }
    public string AnthropicModel { get; set; } = "claude-haiku-4-5-20251001";
    public int MaxTokens { get; set; } = 600;
    public TimeSpan CacheTtl { get; set; } = TimeSpan.FromHours(24);
    public int RateLimitPerMinutePerIp { get; set; } = 30;
}
