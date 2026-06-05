import { buildApiUrl } from "./api-client";

export interface ExternalFeed {
  id: string;
  listingId: string;
  source: "Airbnb" | "Booking.com" | "Vrbo" | "Other";
  url: string;
  createdAt: string;
  lastSyncedAt: string | null;
  lastError: string | null;
}

export async function listFeeds(accessToken: string, listingId: string): Promise<ExternalFeed[]> {
  const res = await fetch(buildApiUrl(`/api/listings/${listingId}/external-calendars`), {
    credentials: "include",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<ExternalFeed[]>;
}

export async function addFeed(
  accessToken: string,
  listingId: string,
  source: ExternalFeed["source"],
  url: string,
): Promise<ExternalFeed> {
  const res = await fetch(buildApiUrl(`/api/listings/${listingId}/external-calendars`), {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ source, url }),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<ExternalFeed>;
}

export async function removeFeed(accessToken: string, listingId: string, feedId: string): Promise<void> {
  const res = await fetch(buildApiUrl(`/api/listings/${listingId}/external-calendars/${feedId}`), {
    method: "DELETE",
    credentials: "include",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
}

export async function getMyIcalUrl(accessToken: string, listingId: string): Promise<{ url: string }> {
  const res = await fetch(buildApiUrl(`/api/listings/${listingId}/ical-url`), {
    credentials: "include",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<{ url: string }>;
}
