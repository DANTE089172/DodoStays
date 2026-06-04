using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Xunit;
using FluentAssertions;
using Dodostays.Api.Contracts.Listings;

namespace Dodostays.Api.IntegrationTests.Listings;

public class ListingPhotoFlowTests : IClassFixture<PostgresFixture>
{
    private readonly PostgresFixture _fx;

    public ListingPhotoFlowTests(PostgresFixture fx) => _fx = fx;

    private static byte[] FakeJpegBytes()
    {
        return new byte[] { 0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, (byte)'J', (byte)'F', (byte)'I', (byte)'F', 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xD9 };
    }

    [Fact]
    public async Task Host_can_upload_and_delete_photo()
    {
        using var factory = _fx.CreateFactory();
        var (host, _) = await ListingTestHelpers.CreateAuthenticatedHostAsync(factory);
        var create = await host.PostAsJsonAsync("/api/listings", ListingTestHelpers.SampleListing());
        var dto = await create.Content.ReadFromJsonAsync<ListingDto>();

        using var content = new MultipartFormDataContent();
        var bytes = FakeJpegBytes();
        var fileContent = new ByteArrayContent(bytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        content.Add(fileContent, "file", "test.jpg");
        content.Add(new StringContent("Front view"), "caption");

        var upload = await host.PostAsync($"/api/listings/{dto!.Id}/photos", content);
        upload.StatusCode.Should().Be(HttpStatusCode.Created);
        var photo = await upload.Content.ReadFromJsonAsync<ListingPhotoDto>();
        photo!.PublicUrl.Should().StartWith("http://");
        photo.Caption.Should().Be("Front view");

        var get = await host.GetAsync($"/api/listings/{dto.Id}");
        var fetched = await get.Content.ReadFromJsonAsync<ListingDto>();
        fetched!.Photos.Should().ContainSingle(p => p.Id == photo.Id);

        var del = await host.DeleteAsync($"/api/listings/{dto.Id}/photos/{photo.Id}");
        del.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var get2 = await host.GetAsync($"/api/listings/{dto.Id}");
        var fetched2 = await get2.Content.ReadFromJsonAsync<ListingDto>();
        fetched2!.Photos.Should().BeEmpty();
    }

    [Fact]
    public async Task Upload_rejects_unsupported_content_type()
    {
        using var factory = _fx.CreateFactory();
        var (host, _) = await ListingTestHelpers.CreateAuthenticatedHostAsync(factory);
        var create = await host.PostAsJsonAsync("/api/listings", ListingTestHelpers.SampleListing());
        var dto = await create.Content.ReadFromJsonAsync<ListingDto>();

        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(new byte[] { 1, 2, 3 });
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("text/plain");
        content.Add(fileContent, "file", "test.txt");

        var upload = await host.PostAsync($"/api/listings/{dto!.Id}/photos", content);
        upload.StatusCode.Should().Be(HttpStatusCode.UnsupportedMediaType);
    }
}
