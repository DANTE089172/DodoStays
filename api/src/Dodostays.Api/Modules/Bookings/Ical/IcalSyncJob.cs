using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Dodostays.Api.Modules.Bookings.Domain;
using Dodostays.Api.Modules.Common.Database;

namespace Dodostays.Api.Modules.Bookings.Ical;

public sealed class IcalSyncJob
{
    private readonly DodostaysDbContext _db;
    private readonly IIcalFeedFetcher _fetcher;
    private readonly IcalFeedParser _parser;
    private readonly ILogger<IcalSyncJob> _logger;

    public IcalSyncJob(DodostaysDbContext db, IIcalFeedFetcher fetcher, IcalFeedParser parser, ILogger<IcalSyncJob> logger)
    {
        _db = db;
        _fetcher = fetcher;
        _parser = parser;
        _logger = logger;
    }

    public async Task RunAsync(CancellationToken ct = default)
    {
        var feeds = await _db.ExternalCalendarFeeds.ToListAsync(ct);
        foreach (var feed in feeds)
        {
            try
            {
                var ics = await _fetcher.FetchAsync(feed.Url, ct);
                var parsed = _parser.Parse(ics);
                await UpsertBlocksAsync(feed, parsed, ct);
                feed.LastSyncedAt = DateTimeOffset.UtcNow;
                feed.LastError = null;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "iCal sync failed for feed {FeedId} ({Url})", feed.Id, feed.Url);
                feed.LastError = ex.Message.Length > 1900 ? ex.Message[..1900] : ex.Message;
            }
            await _db.SaveChangesAsync(ct);
        }
    }

    private async Task UpsertBlocksAsync(ExternalCalendarFeed feed, IReadOnlyList<ParsedIcalEvent> events, CancellationToken ct)
    {
        var existing = await _db.ExternalCalendarBlocks
            .Where(b => b.FeedId == feed.Id)
            .ToListAsync(ct);

        var existingByUid = existing.ToDictionary(b => b.ExternalUid);
        var seenUids = new HashSet<string>();

        foreach (var ev in events)
        {
            seenUids.Add(ev.ExternalUid);
            if (existingByUid.TryGetValue(ev.ExternalUid, out var block))
            {
                block.CheckIn = ev.CheckIn;
                block.CheckOut = ev.CheckOut;
                block.Summary = ev.Summary;
                block.SyncedAt = DateTimeOffset.UtcNow;
            }
            else
            {
                _db.ExternalCalendarBlocks.Add(new ExternalCalendarBlock
                {
                    ListingId = feed.ListingId,
                    FeedId = feed.Id,
                    ExternalUid = ev.ExternalUid,
                    CheckIn = ev.CheckIn,
                    CheckOut = ev.CheckOut,
                    Summary = ev.Summary,
                });
            }
        }

        // Remove blocks no longer in the feed
        foreach (var stale in existing.Where(b => !seenUids.Contains(b.ExternalUid)))
        {
            _db.ExternalCalendarBlocks.Remove(stale);
        }
    }
}
