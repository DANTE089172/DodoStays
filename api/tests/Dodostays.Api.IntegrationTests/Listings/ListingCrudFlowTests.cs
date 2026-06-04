using System.Net;
using System.Net.Http.Json;
using Xunit;
using FluentAssertions;
using Dodostays.Api.Contracts.Listings;

namespace Dodostays.Api.IntegrationTests.Listings;

public class ListingCrudFlowTests : IClassFixture<PostgresFixture>
{
    private readonly PostgresFixture _fx;

    public ListingCrudFlowTests(PostgresFixture fx) => _fx = fx;

    [Fact]
    public async Task Host_can_create_update_delete_listing()
    {
        using var factory = _fx.CreateFactory();
        var (client, auth) = await ListingTestHelpers.CreateAuthenticatedHostAsync(factory);

        var create = await client.PostAsJsonAsync("/api/listings", ListingTestHelpers.SampleListing());
        create.StatusCode.Should().Be(HttpStatusCode.Created);
        var dto = await create.Content.ReadFromJsonAsync<ListingDto>();
        dto!.HostUserId.Should().Be(auth.User.Id);
        dto.Status.Should().Be(ListingStatus.Draft);
        dto.Region.Should().Be("flic-en-flac");

        var update = await client.PutAsJsonAsync($"/api/listings/{dto.Id}",
            ListingTestHelpers.SampleListing() with { Title = "Updated villa" });
        update.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await update.Content.ReadFromJsonAsync<ListingDto>();
        updated!.Title.Should().Be("Updated villa");

        var del = await client.DeleteAsync($"/api/listings/{dto.Id}");
        del.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var get = await client.GetAsync($"/api/listings/{dto.Id}");
        get.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Host_cannot_update_someone_elses_listing()
    {
        using var factory = _fx.CreateFactory();
        var (host1Client, _) = await ListingTestHelpers.CreateAuthenticatedHostAsync(factory);
        var create = await host1Client.PostAsJsonAsync("/api/listings", ListingTestHelpers.SampleListing());
        var dto = await create.Content.ReadFromJsonAsync<ListingDto>();

        var (host2Client, _) = await ListingTestHelpers.CreateAuthenticatedHostAsync(factory);
        var attempt = await host2Client.PutAsJsonAsync($"/api/listings/{dto!.Id}", ListingTestHelpers.SampleListing());

        attempt.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Anonymous_user_cannot_create_listing()
    {
        using var factory = _fx.CreateFactory();
        var client = factory.CreateClient();

        var res = await client.PostAsJsonAsync("/api/listings", ListingTestHelpers.SampleListing());

        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetMine_returns_only_host_listings()
    {
        using var factory = _fx.CreateFactory();
        var (host1Client, host1Auth) = await ListingTestHelpers.CreateAuthenticatedHostAsync(factory);
        await host1Client.PostAsJsonAsync("/api/listings", ListingTestHelpers.SampleListing() with { Title = "Host1 villa" });

        var (host2Client, _) = await ListingTestHelpers.CreateAuthenticatedHostAsync(factory);
        await host2Client.PostAsJsonAsync("/api/listings", ListingTestHelpers.SampleListing() with { Title = "Host2 villa" });

        var mine1 = await host1Client.GetAsync("/api/listings/mine");
        var items1 = await mine1.Content.ReadFromJsonAsync<List<ListingDto>>();
        items1.Should().HaveCount(1);
        items1![0].Title.Should().Be("Host1 villa");
        items1[0].HostUserId.Should().Be(host1Auth.User.Id);
    }
}
