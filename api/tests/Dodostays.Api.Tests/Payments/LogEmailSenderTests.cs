using System.Text.Json;
using Xunit;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Dodostays.Api.Modules.Payments.Email;
using Microsoft.Extensions.FileProviders;

namespace Dodostays.Api.Tests.Payments;

public class LogEmailSenderTests
{
    [Fact]
    public async Task Send_WritesEnvelopeFile_AndReturnsMessageId()
    {
        // Arrange
        var tempDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempDir);
        var env = new TestWebHostEnvironment { WebRootPath = tempDir };
        var options = Options.Create(new EmailOptions { OutputDir = "wwwroot/emails", FromAddress = "test@example.com" });
        var sender = new LogEmailSender(env, options, NullLogger<LogEmailSender>.Instance);

        var message = new EmailMessage(
            To: "alice@example.com",
            Subject: "Welcome",
            Body: "<p>hi</p>",
            IsHtml: true);

        // Act
        var messageId = await sender.SendAsync(message, CancellationToken.None);

        // Assert
        messageId.Should().NotBeNullOrEmpty();

        var files = Directory.GetFiles(tempDir, "*.eml.json", SearchOption.AllDirectories);
        files.Should().ContainSingle();

        var json = await File.ReadAllTextAsync(files[0]);
        var envelope = JsonSerializer.Deserialize<JsonElement>(json);
        envelope.GetProperty("To").GetString().Should().Be("alice@example.com");
        envelope.GetProperty("Subject").GetString().Should().Be("Welcome");
        envelope.GetProperty("Body").GetString().Should().Be("<p>hi</p>");
        envelope.GetProperty("MessageId").GetString().Should().Be(messageId);

        // Cleanup
        Directory.Delete(tempDir, true);
    }

    [Fact]
    public async Task Send_WithAttachment_WritesBinaryAlongside()
    {
        // Arrange
        var tempDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempDir);
        var env = new TestWebHostEnvironment { WebRootPath = tempDir };
        var options = Options.Create(new EmailOptions { OutputDir = "wwwroot/emails", FromAddress = "test@example.com" });
        var sender = new LogEmailSender(env, options, NullLogger<LogEmailSender>.Instance);

        var pdfBytes = new byte[] { 0x25, 0x50, 0x44, 0x46 }; // PDF magic bytes
        var attachment = new EmailAttachment("invoice.pdf", "application/pdf", pdfBytes);
        var message = new EmailMessage(
            To: "bob@example.com",
            Subject: "Your Invoice",
            Body: "Attached",
            IsHtml: false,
            Attachments: new[] { attachment });

        // Act
        var messageId = await sender.SendAsync(message, CancellationToken.None);

        // Assert
        var attachmentFiles = Directory.GetFiles(tempDir, $"{messageId}-invoice.pdf", SearchOption.AllDirectories);
        attachmentFiles.Should().ContainSingle();

        var savedBytes = await File.ReadAllBytesAsync(attachmentFiles[0]);
        savedBytes.Should().Equal(pdfBytes);

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
