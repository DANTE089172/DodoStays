using System.Text.Json;
using Xunit;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Dodostays.Api.Modules.Payments.Sms;
using Microsoft.Extensions.FileProviders;

namespace Dodostays.Api.Tests.Payments;

public class LogSmsSenderTests
{
    [Fact]
    public async Task Send_WritesEnvelopeFile_AndReturnsMessageId()
    {
        // Arrange
        var tempDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempDir);
        var env = new TestWebHostEnvironment { WebRootPath = tempDir };
        var options = Options.Create(new SmsOptions { OutputDir = "wwwroot/sms" });
        var sender = new LogSmsSender(env, options, NullLogger<LogSmsSender>.Instance);

        var message = new SmsMessage(ToPhoneE164: "+23012345678", Body: "Test");

        // Act
        var messageId = await sender.SendAsync(message, CancellationToken.None);

        // Assert
        messageId.Should().NotBeNullOrEmpty();

        var files = Directory.GetFiles(tempDir, "*.sms.json", SearchOption.AllDirectories);
        files.Should().ContainSingle();

        var json = await File.ReadAllTextAsync(files[0]);
        var envelope = JsonSerializer.Deserialize<JsonElement>(json);
        envelope.GetProperty("To").GetString().Should().Be("+23012345678");
        envelope.GetProperty("Body").GetString().Should().Be("Test");
        envelope.GetProperty("MessageId").GetString().Should().Be(messageId);
        envelope.GetProperty("From").GetString().Should().Be("+230-DODO-DEV");

        // Cleanup
        Directory.Delete(tempDir, true);
    }

    internal sealed class TestWebHostEnvironment : IWebHostEnvironment
    {
        public string WebRootPath { get; set; } = "";
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string ApplicationName { get; set; } = "Test";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
        public string ContentRootPath { get; set; } = "";
        public string EnvironmentName { get; set; } = "Development";
    }
}
