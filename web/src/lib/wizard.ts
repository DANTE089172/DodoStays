import type { Listing } from "./listings";

export type HostStepKey =
  | "basics"
  | "location"
  | "capacity"
  | "pricing"
  | "amenities"
  | "photos"
  | "channels"
  | "publish";

export interface HostStepDef {
  key: HostStepKey;
  number: string;     // "01".."08" — Caveat-rendered
  title: string;      // Fraunces title
  glyph: "wave" | "leaf" | "mountain" | "town" | "compass" | "sun" | "anchor" | "stamp";
  isComplete: (l: Listing) => boolean;
}

export const HOST_STEPS: HostStepDef[] = [
  {
    key: "basics",
    number: "01",
    title: "Basics",
    glyph: "compass",
    isComplete: (l) => l.title.trim().length >= 3 && l.description.trim().length >= 10,
  },
  {
    key: "location",
    number: "02",
    title: "Location",
    glyph: "anchor",
    isComplete: (l) => !!l.region && !!l.addressLine && Number.isFinite(l.latitude) && Number.isFinite(l.longitude),
  },
  {
    key: "capacity",
    number: "03",
    title: "Capacity",
    glyph: "town",
    isComplete: (l) => l.bedrooms >= 0 && l.beds >= 1 && l.bathrooms >= 0 && l.maxGuests >= 1 && l.minStayNights >= 1,
  },
  {
    key: "pricing",
    number: "04",
    title: "Pricing",
    glyph: "sun",
    isComplete: (l) => l.nightlyRateMur > 0 && l.cleaningFeeMur >= 0,
  },
  {
    key: "amenities",
    number: "05",
    title: "Amenities",
    glyph: "leaf",
    isComplete: (l) => l.amenities.length > 0,
  },
  {
    key: "photos",
    number: "06",
    title: "Photos",
    glyph: "mountain",
    isComplete: (l) => l.photos.length >= 1,
  },
  {
    key: "channels",
    number: "07",
    title: "Channels",
    glyph: "wave",
    isComplete: (_) => true,    // optional; never gates Publish
  },
  {
    key: "publish",
    number: "08",
    title: "Publish",
    glyph: "stamp",
    isComplete: (l) => l.status === "Published",
  },
];

export function indexOfStep(key: HostStepKey): number {
  const i = HOST_STEPS.findIndex((s) => s.key === key);
  return i < 0 ? 0 : i;
}

export function stepFromUrl(searchParams: URLSearchParams | string | null): HostStepKey {
  const sp = typeof searchParams === "string"
    ? new URLSearchParams(searchParams)
    : searchParams ?? new URLSearchParams();
  const fromUrl = sp.get?.("step") as HostStepKey | null;
  if (fromUrl && HOST_STEPS.some((s) => s.key === fromUrl)) return fromUrl;
  return "basics";
}

export type BookingStepKey = "dates" | "guests" | "review" | "confirm";

export interface BookingStepDef {
  key: BookingStepKey;
  number: string;
  title: string;
}

export const BOOKING_STEPS: BookingStepDef[] = [
  { key: "dates",   number: "01", title: "When are you staying?" },
  { key: "guests",  number: "02", title: "Who's coming?" },
  { key: "review",  number: "03", title: "Review your trip" },
  { key: "confirm", number: "04", title: "Hold & confirm" },
];
