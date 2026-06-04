using Xunit;
using FluentAssertions;
using Microsoft.Extensions.Options;
using Dodostays.Api.Modules.Listings.Storage;

namespace Dodostays.Api.Tests.Listings;

public class LocalFilesystemPhotoStorageTests : IDisposable
{
    private readonly string _root;
    private readonly LocalFilesystemPhotoStorage _storage;

    public LocalFilesystemPhotoStorageTests()
    {
        _root = Path.Combine(Path.GetTempPath(), "ds-photo-tests-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_root);
        var opts = Options.Create(new PhotoStorageOptions
        {
            Provider = "Local",
            LocalRoot = _root,
            PublicBaseUrl = "http://localhost:5080/photos"
        });
        _storage = new LocalFilesystemPhotoStorage(opts);
    }

    [Fact]
    public async Task SaveAsync_writes_file_and_returns_relative_path()
    {
        var listingId = Guid.NewGuid();
        var content = new byte[] { 1, 2, 3, 4, 5 };
        using var stream = new MemoryStream(content);

        var result = await _storage.SaveAsync(listingId, "test.jpg", "image/jpeg", stream, CancellationToken.None);

        result.RelativePath.Should().StartWith($"{listingId}/");
        result.RelativePath.Should().EndWith(".jpg");
        result.PublicUrl.Should().StartWith("http://localhost:5080/photos/");
        var fullPath = Path.Combine(_root, result.RelativePath);
        File.Exists(fullPath).Should().BeTrue();
        (await File.ReadAllBytesAsync(fullPath)).Should().Equal(content);
    }

    [Fact]
    public async Task DeleteAsync_removes_file()
    {
        var listingId = Guid.NewGuid();
        using var stream = new MemoryStream(new byte[] { 1, 2, 3 });
        var saved = await _storage.SaveAsync(listingId, "x.png", "image/png", stream, CancellationToken.None);
        var fullPath = Path.Combine(_root, saved.RelativePath);
        File.Exists(fullPath).Should().BeTrue();

        await _storage.DeleteAsync(saved.RelativePath, CancellationToken.None);

        File.Exists(fullPath).Should().BeFalse();
    }

    [Fact]
    public async Task DeleteAsync_is_idempotent_when_file_missing()
    {
        var act = async () => await _storage.DeleteAsync("nonexistent/file.jpg", CancellationToken.None);
        await act.Should().NotThrowAsync();
    }

    public void Dispose()
    {
        if (Directory.Exists(_root)) Directory.Delete(_root, recursive: true);
    }
}
