using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using Xunit;
using FluentAssertions;
using Dodostays.Api.Contracts.Bookings;
using Dodostays.Api.Contracts.Listings;
using Dodostays.Api.Modules.Bookings.Ical;
using Dodostays.Api.Modules.Common.Database;
using Dodostays.Api.IntegrationTests.Listings;
using Microsoft.EntityFrameworkCore;

namespace Dodostays.Api.IntegrationTests.Bookings;

public class ExternalFeedFlowTests : IClassFixture<PostgresFixture>
{
    private readonly PostgresFixture _fx;
    public ExternalFeedFlowTests(PostgresFixture fx) => _fx = fx;

    private const string FakeIcs = """
        BEGIN:VCALENDAR
        VERSION:2.0
        PRODID:-//Test//EN
        BEGIN:VEVENT
        UID:test-event-1@example.com
        DTSTAMP:20260315T101010Z
        DTSTART;VALUE=DATE:20260710
        DTEND;VALUE=DATE:20260715
        SUMMARY:External Booking
        END:VEVENT
        END:VCALENDAR
        """;

    private sealed class FakeIcalFetcher : IIcalFeedFetcher
    {
        public string Content { get; set; } = FakeIcs;
        public Task<string> FetchAsync(string url, CancellationToken ct) => Task.FromResult(Content);
    }

    [Fact]
    public async Task Add_external_feed_then_run_sync_creates_block()
    {
        var fakeFetcher = new FakeIcalFetcher();
        using var factory = _fx.CreateFactory().WithWebHostBuilder(b =>
        {
            b.ConfigureServices(svc =>
            {
                var existing = svc.Where(d => d.ServiceType == typeof(IIcalFeedFetcher)).ToList();
                foreach (var d in existing) svc.Remove(d);
                svc.AddSingleton<IIcalFeedFetcher>(fakeFetcher);
            });
        });

        var (host, _) = await ListingTestHelpers.CreateAuthenticatedHostAsync(factory);
        var create = await host.PostAsJsonAsync("/api/listings", ListingTestHelpers.SampleListing());
        var listing = (await create.Content.ReadFromJsonAsync<ListingDto>())!;

        var add = await host.PostAsJsonAsync($"/api/listings/{listing.Id}/external-calendars",
            new AddExternalFeedRequest("Airbnb", "https://airbnb.example.com/calendar.ics"));
        add.StatusCode.Should().Be(HttpStatusCode.Created);
        var feed = await add.Content.ReadFromJsonAsync<ExternalFeedDto>();

        var list = await host.GetAsync($"/api/listings/{listing.Id}/external-calendars");
        list.StatusCode.Should().Be(HttpStatusCode.OK);
        var feeds = await list.Content.ReadFromJsonAsync<List<ExternalFeedDto>>();
        feeds.Should().ContainSingle(f => f.Id == feed!.Id);

        // Run the sync job by hand
        using (var scope = factory.Services.CreateScope())
        {
            var job = scope.ServiceProvider.GetRequiredService<IcalSyncJob>();
            await job.RunAsync(CancellationToken.None);
        }

        // Assert the block was created
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<DodostaysDbContext>();
            var block = await db.ExternalCalendarBlocks
                .FirstOrDefaultAsync(b => b.FeedId == feed!.Id);
            block.Should().NotBeNull();
            block!.CheckIn.Should().Be(new DateOnly(2026, 7, 10));
            block.CheckOut.Should().Be(new DateOnly(2026, 7, 15));
        }

        // Availability now reflects the block
        var avail = await host.GetAsync($"/api/listings/{listing.Id}/availability?from=2026-07-12&to=2026-07-14");
        avail.StatusCode.Should().Be(HttpStatusCode.OK);
        var availResp = await avail.Content.ReadFromJsonAsync<AvailabilityResponse>();
        availResp!.IsAvailable.Should().BeFalse();
    }

    [Fact]
    public async Task Remove_feed_cascades_delete_of_blocks()
    {
        var fakeFetcher = new FakeIcalFetcher();
        using var factory = _fx.CreateFactory().WithWebHostBuilder(b =>
        {
            b.ConfigureServices(svc =>
            {
                var existing = svc.Where(d => d.ServiceType == typeof(IIcalFeedFetcher)).ToList();
                foreach (var d in existing) svc.Remove(d);
                svc.AddSingleton<IIcalFeedFetcher>(fakeFetcher);
            });
        });

        var (host, _) = await ListingTestHelpers.CreateAuthenticatedHostAsync(factory);
        var create = await host.PostAsJsonAsync("/api/listings", ListingTestHelpers.SampleListing());
        var listing = (await create.Content.ReadFromJsonAsync<ListingDto>())!;

        var add = await host.PostAsJsonAsync($"/api/listings/{listing.Id}/external-calendars",
            new AddExternalFeedRequest("Airbnb", "https://airbnb.example.com/calendar.ics"));
        var feed = (await add.Content.ReadFromJsonAsync<ExternalFeedDto>())!;

        using (var scope = factory.Services.CreateScope())
        {
            var job = scope.ServiceProvider.GetRequiredService<IcalSyncJob>();
            await job.RunAsync(CancellationToken.None);
        }

        var del = await host.DeleteAsync($"/api/listings/{listing.Id}/external-calendars/{feed.Id}");
        del.StatusCode.Should().Be(HttpStatusCode.NoContent);

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<DodostaysDbContext>();
            (await db.ExternalCalendarBlocks.AnyAsync(b => b.FeedId == feed.Id)).Should().BeFalse();
            (await db.ExternalCalendarFeeds.AnyAsync(f => f.Id == feed.Id)).Should().BeFalse();
        }
    }
}
