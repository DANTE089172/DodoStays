"use client";

import { useEffect, useState } from "react";
import { Alert, MenuItem, Select, Stack, TextField } from "@mui/material";
import { addFeed, listFeeds, removeFeed, type ExternalFeed } from "@/lib/ical";
import { useAuth } from "@/lib/auth-context";
import { Eyebrow } from "@/components/marketing/eyebrow";
import { PillButton, pillButtonClasses } from "@/components/marketing/pill-button";
import { cn } from "@/lib/utils";

interface Props { listingId: string; }

export function ExternalFeedList({ listingId }: Props) {
  const { accessToken } = useAuth();
  const [feeds, setFeeds] = useState<ExternalFeed[] | null>(null);
  const [source, setSource] = useState<ExternalFeed["source"]>("Airbnb");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFeeds(null);
    listFeeds(accessToken, listingId).then(setFeeds).catch((e) => setError((e as Error).message));
  }, [accessToken, listingId]);

  async function add() {
    if (!accessToken || !url.trim()) return;
    setBusy(true); setError(null);
    try {
      const created = await addFeed(accessToken, listingId, source, url.trim());
      setFeeds((curr) => curr ? [created, ...curr] : [created]);
      setUrl("");
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  async function remove(feedId: string) {
    if (!accessToken || !confirm("Remove this calendar feed? Synced blocks will be deleted.")) return;
    try {
      await removeFeed(accessToken, listingId, feedId);
      setFeeds((curr) => curr?.filter((f) => f.id !== feedId) ?? null);
    } catch (e) { setError((e as Error).message); }
  }

  return (
    <div>
      <Eyebrow tone="muted">External calendars</Eyebrow>
      <h3 className="mt-2 font-[var(--font-display)] text-xl font-semibold leading-tight">
        External calendars (iCal)
      </h3>
      <p className="mb-4 mt-2 text-sm text-[var(--color-muted-foreground)]">
        Paste your Airbnb / Booking.com iCal URL here so external bookings block these dates on DodoStays. We sync every 15 minutes.
      </p>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 2 }}>
        <Select
          value={source}
          onChange={(e) => setSource(e.target.value as ExternalFeed["source"])}
          size="small"
          sx={{ minWidth: 140, backgroundColor: "var(--color-card)" }}
        >
          <MenuItem value="Airbnb">Airbnb</MenuItem>
          <MenuItem value="Booking.com">Booking.com</MenuItem>
          <MenuItem value="Vrbo">Vrbo</MenuItem>
          <MenuItem value="Other">Other</MenuItem>
        </Select>
        <TextField
          size="small"
          fullWidth
          placeholder="https://www.airbnb.com/calendar/ical/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          sx={{ "& .MuiInputBase-root": { backgroundColor: "var(--color-card)" } }}
        />
        <PillButton onClick={add} disabled={busy || !url.trim()} variant="solid" size="sm">
          Add
        </PillButton>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {feeds === null && (
        <p className="text-sm text-[var(--color-muted-foreground)]">Loading…</p>
      )}
      {feeds !== null && feeds.length === 0 && (
        <p className="text-sm text-[var(--color-muted-foreground)]">
          No external calendars yet.
        </p>
      )}
      {feeds !== null && feeds.length > 0 && (
        <ul className="flex flex-col gap-3">
          {feeds.map((f) => (
            <li
              key={f.id}
              className="flex items-center gap-3 rounded-lg border border-[color-mix(in_srgb,var(--color-foreground)_10%,transparent)] bg-[var(--color-card)] p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="font-[var(--font-sans)] text-sm font-semibold">
                  {f.source}
                </p>
                <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                  {f.url}
                </p>
                <p
                  className={cn(
                    "text-xs",
                    f.lastError
                      ? "text-[var(--color-destructive)]"
                      : "text-[var(--color-muted-foreground)]",
                  )}
                >
                  {f.lastError
                    ? `Error: ${f.lastError}`
                    : f.lastSyncedAt
                      ? `Last synced: ${new Date(f.lastSyncedAt).toLocaleString()}`
                      : "Pending first sync"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(f.id)}
                aria-label="remove"
                className={cn(
                  pillButtonClasses({ variant: "ghost", size: "sm" }),
                  "px-3",
                )}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
