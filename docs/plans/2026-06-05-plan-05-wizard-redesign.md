# DodoStays Plan 05 — Wizard Redesign (Host Field Journal + Guest Boarding Pass)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the long-scroll host listing edit page with an 8-step wizard styled as a hand-stitched **field journal**, and replace the cramped booking sidebar with a 4-step wizard styled as a **boarding pass**. Auto-save on Next; deep-link to a step via `?step=N`. Keeps the Sega & Sand × Cinema Maurice brand DNA intact while making the per-step UI a distinctive, opinionated experience — not generic Material steppers.

**Pre-conditions (Plan 03 outputs):**
- Host edit page at `web/src/app/host/listings/[id]/edit/page.tsx` (currently long scroll: Photos / Property / Location / Capacity / Pricing / Amenities / Channels)
- Booking sidebar at `web/src/app/listings/[id]/booking-sidebar.tsx` (single panel: dates → guests → review → hold → confirm)
- 7 e2e tests passing: smoke + auth + listings + 2 search + booking + ical
- MUI v6 hybrid themed; CSS vars for the brand palette; Fraunces/Plex/Caveat fonts loaded
- Backend listings + bookings endpoints all live; PATCH-style updates to `/api/listings/{id}` already work via `updateListing`

**Architecture choice:** **Use MUI as a primitive substrate where it earns its weight (focus management, keyboard nav, accessibility on `Tabs`/`Stepper`/`Slide`/`Fade`) — but build the visible chrome from scratch. Don't theme MUI Stepper into compliance; it would still feel like Material. Instead, custom SVG seam + custom step-card layout, MUI handles only `Slide` transitions + step focus delegation.**

---

## File Structure (this plan adds / changes)

```
web/src/
├── lib/
│   ├── wizard.ts                     # NEW — step definitions + URL state helpers
│   └── auto-save.ts                  # NEW — debounced PATCH helper + indicator state
├── components/
│   ├── wizard/
│   │   ├── journal-stepper.tsx       # NEW — hand-stitched vertical seam stepper
│   │   ├── journal-page.tsx          # NEW — single step page card with paper texture
│   │   ├── journal-footer.tsx        # NEW — sticky bottom bar (Prev / progress / Next)
│   │   ├── journal-glyph.tsx         # NEW — top-right SVG motif per step
│   │   ├── saved-indicator.tsx       # NEW — Caveat ochre "saved 12s ago — mo gardé"
│   │   ├── ribbon-toast.tsx          # NEW — top-edge sand ribbon (Saved / Published)
│   │   └── pencil-skeleton.tsx       # NEW — hand-drawn skeleton (replaces MUI Skeleton)
│   └── booking-wizard/
│       ├── boarding-pass.tsx         # NEW — full container with paper layers + perforation
│       ├── perforation.tsx           # NEW — dashed-line SVG separator
│       ├── flip-clock.tsx            # NEW — split-flap CSS countdown
│       ├── boarding-stamp.tsx        # NEW — "Confirmed" angled-stamp animation
│       ├── step-1-dates.tsx          # NEW — dates ribbon + nights count
│       ├── step-2-guests.tsx         # NEW — guest counter Caveat
│       ├── step-3-review.tsx         # NEW — itinerary + passenger + fare blocks
│       └── step-4-hold-confirm.tsx   # NEW — flip-clock countdown + Board Now
├── app/
│   ├── host/listings/[id]/edit/
│   │   ├── page.tsx                  # MODIFIED — server fetch only; hands off to wizard
│   │   ├── wizard.tsx                # NEW — client component, owns step state + auto-save
│   │   └── steps/
│   │       ├── basics-step.tsx
│   │       ├── location-step.tsx
│   │       ├── capacity-step.tsx
│   │       ├── pricing-step.tsx
│   │       ├── amenities-step.tsx
│   │       ├── photos-step.tsx       # wraps existing photo-management code
│   │       ├── channels-step.tsx     # wraps CopyIcalUrlCard + ExternalFeedList
│   │       └── publish-step.tsx
│   └── listings/[id]/
│       └── booking-sidebar.tsx       # MODIFIED — wraps boarding pass; preserves state machine
└── e2e/
    └── wizard.spec.ts                # NEW — host wizard step navigation + auto-save + booking wizard board-now
```

**Constraints (preserve all e2e selectors):**

- Smoke: `getByRole("heading", { name: "DodoStays" })` — preserve
- Auth: existing placeholder texts unchanged
- Listings: `getByRole("link", { name: /manage my listings/i })`, `/add listing/i`, listing card `<h3>` — preserve
- Listing form selectors used by `listings.spec.ts` to publish:
  - `page.locator('input').first()` (title), `page.locator('textarea').first()` (description), second non-numeric text input (address)
  - `getByRole("button", { name: /save as draft/i })` — must stay on the page that opens after `+ Add listing`
  - `getByRole("button", { name: /^publish$/i })`
  - `getByText(/^Published$/)`
- Booking flow used by `bookings.spec.ts`:
  - `getByLabel("Check in")` and `getByLabel("Check out")` — stay
  - `getByRole("button", { name: /^hold dates$/i })` — stay
  - `getByRole("button", { name: /^confirm booking$/i })` — KEEP this exact name. The boarding pass UI shows "BOARD NOW" as the visual label, but the underlying button retains `accessible name = "Confirm booking"` via `aria-label`. Tests pass; users see "BOARD NOW".
  - `/bookings` route + listing title `<h3>` on the cards — preserve
- iCal: `Channels` heading + placeholder text + remove icon — preserved by wrapping the existing components in the new `channels-step.tsx`

**KEY DECISION:** New listing creation (`/host/listings/new`) STAYS as the existing simple `<ListingForm submitLabel="Save as draft" />` — the `listings.spec.ts` e2e test enters title/description/address there, clicks "Save as draft", lands on `/host/listings/{id}/edit`, then clicks "Publish". The wizard takes over ON the edit page. This preserves the test selectors AND gives a faster first-listing experience (one form, save as draft, then iterate in the wizard).

---

## Visual concept reference

### Field journal (host)

```
┌───────────────────┬─────────────────────────────────────────────┐
│   ╲                │                          [glyph: wave]      │
│    01              │                                              │
│    Basics          │   01 — Basics                                │
│  (active)          │                                              │
│   ╱                │   ─ TITLE ─                                  │
│   ╲                │   ┌──────────────────────────┐              │
│    02              │   │ Sunny villa with pool    │              │
│    Location        │   └──────────────────────────┘              │
│   ╱                │   ✎ this is the headline guests see        │
│   ╲                │                                              │
│    03              │   ─ DESCRIPTION ─                            │
│    Capacity        │   ┌──────────────────────────┐              │
│   ╱                │   │ ...                      │              │
│   ╲                │   └──────────────────────────┘              │
│   ...              │                                              │
│                    │                                              │
│                    │                                              │
│ saved 12s ago —    │                                              │
│   mo gardé         │                                              │
└───────────────────┴─────────────────────────────────────────────┘
                      ┌────────────────────────────────────────────┐
                      │ ← Prev    01 of 08 — Basics    Save & cont→│
                      └────────────────────────────────────────────┘
```

- The vertical seam on the left is a single SVG `<path>` of a hand-drawn slightly-imperfect line, ochre `#D4A24C`, 1.5px stroke, dasharray `6 4 8 5 6 7` for irregular stitches.
- Numerals are Caveat ochre 32px; titles are Fraunces 18px ink; non-active steps have 50% opacity.
- Active step: 1.5px ochre border on the page card, plus an inset 4px coral shadow `inset 0 0 0 1.5px rgba(232,99,60,0.4)`.

### Boarding pass (guest)

```
┌─────────────────────────────────────┐
│  DODOSTAYS · Sunny villa · #BK-1234 │  ← header
│                                     │
│  ─── ─── ─── ─── ─── ─── ─── ───   │  ← perforation (active before review)
│                                     │
│   01 of 04 — When are you staying?  │
│                                     │
│   [ Check in ]   [ Check out ]      │
│                                     │
│      3 NIGHTS                       │  ← Fraunces big
│                                     │
│  ─── ─── ─── ─── ─── ─── ─── ───   │
│                                     │
│   02 — Who's coming?                │  ← unfilled = greyed
│   ...                               │
└─────────────────────────────────────┘
```

- Outer container: `--color-card` paper bg + 1.5px ochre border + 4px ink hard-offset shadow (the existing block-print look).
- Perforation between sections: SVG `<line>` with `stroke-dasharray="3 6"` ochre, 1px tall, full width.
- Each step's section has `min-height: 120px`. Inactive sections show greyed-out content with a placeholder line: *"complete previous steps to unlock"* in Caveat.
- After confirmation: container slides up 8px, a "CONFIRMED" red-ink stamp appears at -8° rotation with `transform-origin: center; transition: transform 400ms ease-out`. Stamp is an SVG path with red ink-bleed effect (1px red shadow).

---

## Task 5.1: Wizard library + step config + auto-save helper

**Files:**
- Create: `web/src/lib/wizard.ts`
- Create: `web/src/lib/auto-save.ts`

These are pure-TS libs with no UI yet.

- [ ] **Step 1: Create `web/src/lib/wizard.ts`**

```ts
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
```

- [ ] **Step 2: Create `web/src/lib/auto-save.ts`**

```ts
import { useCallback, useEffect, useRef, useState } from "react";

export type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: Date }
  | { kind: "error"; message: string };

/**
 * Debounced auto-save hook. Pass an async save function;
 * returns a `flush()` you can call manually (e.g. on "Next" click)
 * and a `state` you can render in the saved-indicator.
 */
export function useAutoSave<T>(
  value: T,
  save: (value: T) => Promise<void>,
  delayMs = 800,
): { state: SaveState; flush: () => Promise<void>; markDirty: () => void } {
  const [state, setState] = useState<SaveState>({ kind: "idle" });
  const valueRef = useRef(value);
  const dirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const doSave = useCallback(async () => {
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    setState({ kind: "saving" });
    try {
      await save(valueRef.current);
      setState({ kind: "saved", at: new Date() });
    } catch (err) {
      setState({ kind: "error", message: (err as Error).message });
      // Mark dirty again so the next markDirty() / flush() retries
      dirtyRef.current = true;
    }
  }, [save]);

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
    setState((s) => (s.kind === "error" ? s : { kind: "idle" }));
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { void doSave(); }, delayMs);
  }, [doSave, delayMs]);

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    await doSave();
  }, [doSave]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { state, flush, markDirty };
}

/**
 * Friendly "saved 12s ago" formatter.
 */
export function timeAgo(date: Date, now: Date = new Date()): string {
  const seconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}
```

- [ ] **Step 3: Typecheck + commit**

```bash
cd C:/temp/Dodostays/web && npm run typecheck
git -C C:/temp/Dodostays add web/src/lib/wizard.ts web/src/lib/auto-save.ts
git -C C:/temp/Dodostays commit -m "feat(web): wizard step config + useAutoSave hook"
```

---

## Task 5.2: Wizard chrome — JournalStepper, JournalPage, JournalFooter, JournalGlyph, SavedIndicator, RibbonToast, PencilSkeleton

**Files:**
- Create: `web/src/components/wizard/journal-stepper.tsx`
- Create: `web/src/components/wizard/journal-page.tsx`
- Create: `web/src/components/wizard/journal-footer.tsx`
- Create: `web/src/components/wizard/journal-glyph.tsx`
- Create: `web/src/components/wizard/saved-indicator.tsx`
- Create: `web/src/components/wizard/ribbon-toast.tsx`
- Create: `web/src/components/wizard/pencil-skeleton.tsx`

These are the brand chrome pieces. Each is a small, focused component.

- [ ] **Step 1: Create `journal-glyph.tsx`** — 8 SVG motifs

```tsx
"use client";

interface Props {
  glyph: "wave" | "leaf" | "mountain" | "town" | "compass" | "sun" | "anchor" | "stamp";
  size?: number;
  color?: string;
}

const PATHS: Record<Props["glyph"], string> = {
  // hand-drawn-feel single-stroke shapes; 24 viewbox
  wave:     "M2 14 C 5 10, 9 18, 12 14 S 19 10, 22 14",
  leaf:     "M12 4 C 18 4, 21 10, 19 15 C 17 20, 11 22, 7 19 C 3 16, 5 8, 12 4 M12 4 V 19",
  mountain: "M2 19 L 8 9 L 12 15 L 16 7 L 22 19 Z",
  town:     "M3 19 V 11 H 7 V 19 M 9 19 V 7 H 13 V 19 M 15 19 V 13 H 19 V 19 H 3",
  compass:  "M12 3 L 14 11 L 22 12 L 14 13 L 12 21 L 10 13 L 2 12 L 10 11 Z",
  sun:      "M12 7 a 5 5 0 1 1 0 10 a 5 5 0 1 1 0 -10 M12 2 V4 M12 20 V22 M22 12 H20 M2 12 H4 M19 5 L17 7 M5 19 L7 17 M19 19 L17 17 M5 5 L7 7",
  anchor:   "M12 4 a 2 2 0 1 1 0 4 a 2 2 0 1 1 0 -4 M12 8 V20 M7 14 H17 M5 18 a 7 7 0 0 0 14 0",
  stamp:    "M5 5 H19 V19 H5 Z M5 5 L19 19 M19 5 L5 19",
};

export function JournalGlyph({ glyph, size = 36, color = "var(--ds-ochre, #D4A24C)" }: Props) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden focusable="false">
      <circle cx="12" cy="12" r="11" fill="none" stroke={color} strokeWidth="0.8" strokeDasharray="2 2.5" opacity="0.55" />
      <path d={PATHS[glyph]} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
```

- [ ] **Step 2: Create `journal-stepper.tsx`** — vertical hand-stitched seam stepper

```tsx
"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Box, Tooltip } from "@mui/material";
import { HOST_STEPS, type HostStepKey, indexOfStep } from "@/lib/wizard";
import type { Listing } from "@/lib/listings";

interface Props {
  listing: Listing;
  current: HostStepKey;
}

export function JournalStepper({ listing, current }: Props) {
  const sp = useSearchParams();
  const currentIndex = indexOfStep(current);

  function hrefFor(key: HostStepKey): string {
    const params = new URLSearchParams(sp.toString());
    params.set("step", key);
    return `?${params.toString()}`;
  }

  return (
    <Box
      component="nav"
      aria-label="Listing edit steps"
      sx={{
        position: { lg: "sticky" },
        top: { lg: 24 },
        width: { lg: 220 },
        flexShrink: 0,
        py: 2,
      }}
    >
      <SeamSvg activeIndex={currentIndex} total={HOST_STEPS.length} />
      <Box sx={{ position: "relative", display: "flex", flexDirection: "column", gap: 3, pl: 4 }}>
        {HOST_STEPS.map((step) => {
          const complete = step.isComplete(listing);
          const active = step.key === current;
          return (
            <Box key={step.key} sx={{ position: "relative" }}>
              <SeamKnot active={active} complete={complete} />
              <Tooltip title={complete ? "Step complete" : "Step incomplete"} placement="right" disableInteractive>
                <Link href={hrefFor(step.key)} aria-current={active ? "step" : undefined} style={{ textDecoration: "none", color: "inherit" }}>
                  <Box sx={{ opacity: active ? 1 : 0.55, transition: "opacity 200ms ease-out" }}>
                    <Box sx={{ fontFamily: "var(--font-caveat)", fontSize: "1.75rem", color: "var(--ds-ochre, #D4A24C)", lineHeight: 1 }}>
                      {step.number}
                    </Box>
                    <Box sx={{ fontFamily: "var(--font-fraunces)", fontWeight: 600, fontSize: "1.05rem", color: "var(--color-foreground)" }}>
                      {step.title}
                    </Box>
                  </Box>
                </Link>
              </Tooltip>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function SeamSvg({ activeIndex, total }: { activeIndex: number; total: number }) {
  // The seam is a single irregular vertical line of stitches; placed absolutely
  return (
    <svg
      aria-hidden
      focusable="false"
      width="20"
      height="100%"
      viewBox="0 0 20 600"
      preserveAspectRatio="none"
      style={{ position: "absolute", left: 8, top: 16, bottom: 16, height: "calc(100% - 32px)", pointerEvents: "none" }}
    >
      <path
        d="M10 4 V 596"
        stroke="var(--ds-ochre, #D4A24C)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="6 4 8 5 6 7 5 4 7 5 8 4 6 5 7 4"
        fill="none"
      />
    </svg>
  );
}

function SeamKnot({ active, complete }: { active: boolean; complete: boolean }) {
  // A small mark on the seam — filled circle if complete, empty if not
  return (
    <Box
      aria-hidden
      sx={{
        position: "absolute",
        left: -28,
        top: 8,
        width: 14,
        height: 14,
        borderRadius: "50%",
        border: "1.5px solid var(--ds-ochre, #D4A24C)",
        backgroundColor: active ? "var(--color-accent)" : (complete ? "var(--ds-ochre, #D4A24C)" : "var(--color-card)"),
        boxShadow: active ? "0 0 0 4px rgba(232, 99, 60, 0.18)" : "none",
        transition: "background-color 200ms ease-out, box-shadow 200ms ease-out",
      }}
    />
  );
}
```

- [ ] **Step 3: Create `journal-page.tsx`** — single-step page card with paper texture

```tsx
"use client";

import { Box } from "@mui/material";
import { JournalGlyph } from "./journal-glyph";

interface Props {
  number: string;
  title: string;
  glyph: "wave" | "leaf" | "mountain" | "town" | "compass" | "sun" | "anchor" | "stamp";
  children: React.ReactNode;
}

export function JournalPage({ number, title, glyph, children }: Props) {
  return (
    <Box
      component="article"
      sx={{
        position: "relative",
        backgroundColor: "var(--color-card)",
        border: "1.5px solid var(--color-border)",
        borderRadius: "8px",
        boxShadow: "inset 0 0 0 1.5px rgba(232, 99, 60, 0.18), 4px 4px 0 var(--color-foreground)",
        p: { xs: 3, md: 5 },
        // subtle paper-fiber texture using a layered gradient + the existing batik svg-bg overlay
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          borderRadius: "8px",
          backgroundImage:
            "radial-gradient(circle at 20% 30%, rgba(212, 162, 76, 0.04) 0px, transparent 1px)," +
            "radial-gradient(circle at 70% 65%, rgba(20, 20, 16, 0.03) 0px, transparent 1px)",
          backgroundSize: "8px 8px, 12px 12px",
          pointerEvents: "none",
        },
      }}
    >
      <Box sx={{ position: "absolute", top: 16, right: 16 }}>
        <JournalGlyph glyph={glyph} size={36} />
      </Box>
      <Box sx={{ position: "relative" }}>
        <Box sx={{ fontFamily: "var(--font-caveat)", fontSize: "1.25rem", color: "var(--ds-ochre, #D4A24C)", lineHeight: 1 }}>
          {number}
        </Box>
        <Box component="h2" sx={{ mt: 0.5, mb: 4, fontFamily: "var(--font-fraunces)", fontWeight: 600, fontSize: { xs: "1.75rem", md: "2.25rem" } }}>
          {title}
        </Box>
        {children}
      </Box>
    </Box>
  );
}
```

- [ ] **Step 4: Create `journal-footer.tsx`** — sticky bottom bar with prev/progress/next

```tsx
"use client";

import { Box, Button, Stack, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { HOST_STEPS, type HostStepKey, indexOfStep } from "@/lib/wizard";
import type { SaveState } from "@/lib/auto-save";
import { SavedIndicator } from "./saved-indicator";

interface Props {
  current: HostStepKey;
  saveState: SaveState;
  onNext: () => void;     // also called for "Save & continue"
  onPrev: () => void;
  isLastStep: boolean;
  publishLabel?: string;  // overrides the "Save & continue →" on the publish step
  onPublish?: () => void; // optional — only on the publish step
}

export function JournalFooter({ current, saveState, onNext, onPrev, isLastStep, publishLabel, onPublish }: Props) {
  const idx = indexOfStep(current);
  const total = HOST_STEPS.length;

  return (
    <Box
      sx={{
        position: "sticky",
        bottom: 0,
        zIndex: 5,
        mt: 4,
        borderTop: "1.5px solid var(--ds-ochre, #D4A24C)",
        backgroundColor: "var(--color-background)",
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ alignItems: "center", justifyContent: "space-between", maxWidth: 1100, mx: "auto", px: 3, py: 2 }}
      >
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={onPrev}
          variant="text"
          disabled={idx === 0}
          sx={{ color: "var(--color-foreground)", fontFamily: "var(--font-plex)" }}
        >
          Previous
        </Button>

        <Stack alignItems="center" spacing={0.25}>
          <Typography sx={{ fontFamily: "var(--font-caveat)", color: "var(--ds-ochre, #D4A24C)", fontSize: "1rem" }}>
            {String(idx + 1).padStart(2, "0")} of {String(total).padStart(2, "0")} — {HOST_STEPS[idx].title}
          </Typography>
          <SavedIndicator state={saveState} />
        </Stack>

        {isLastStep && onPublish ? (
          <Button
            onClick={onPublish}
            variant="contained"
            sx={{
              backgroundColor: "var(--color-accent)",
              color: "var(--color-accent-foreground)",
              boxShadow: "2px 2px 0 var(--color-foreground)",
              "&:hover": { backgroundColor: "var(--color-accent)", filter: "brightness(0.95)", boxShadow: "2px 2px 0 var(--color-foreground)" },
              fontFamily: "var(--font-plex)",
              minWidth: 200,
            }}
          >
            {publishLabel ?? "Publish"}
          </Button>
        ) : (
          <Button
            endIcon={<ArrowForwardIcon />}
            onClick={onNext}
            variant="contained"
            color="primary"
            sx={{
              boxShadow: "2px 2px 0 var(--color-foreground)",
              "&:hover": { boxShadow: "2px 2px 0 var(--color-foreground)" },
              fontFamily: "var(--font-plex)",
              minWidth: 200,
            }}
          >
            Save &amp; continue
          </Button>
        )}
      </Stack>
    </Box>
  );
}
```

- [ ] **Step 5: Create `saved-indicator.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { Box } from "@mui/material";
import { timeAgo, type SaveState } from "@/lib/auto-save";

export function SavedIndicator({ state }: { state: SaveState }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (state.kind !== "saved") return;
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, [state.kind]);

  let label = "";
  let color = "var(--color-muted-foreground)";
  if (state.kind === "saving") label = "saving…";
  else if (state.kind === "saved") {
    label = `saved ${timeAgo(state.at, now)} — mo gardé`;
    color = "var(--ds-ochre, #D4A24C)";
  } else if (state.kind === "error") {
    label = `couldn't save: ${state.message}`;
    color = "var(--color-destructive)";
  }
  if (!label) return null;

  return (
    <Box sx={{ fontFamily: "var(--font-caveat)", fontStyle: "italic", color, fontSize: "0.875rem", lineHeight: 1 }}>
      {label}
    </Box>
  );
}
```

- [ ] **Step 6: Create `ribbon-toast.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { Box, Slide } from "@mui/material";

interface RibbonToastEvent {
  id: number;
  message: string;
  tone?: "info" | "success" | "warning" | "error";
}

let nextId = 1;
const listeners = new Set<(ev: RibbonToastEvent) => void>();

/** Imperative trigger — call from anywhere. */
export function showRibbon(message: string, tone: RibbonToastEvent["tone"] = "info") {
  const ev: RibbonToastEvent = { id: nextId++, message, tone };
  listeners.forEach((l) => l(ev));
}

export function RibbonToastHost() {
  const [current, setCurrent] = useState<RibbonToastEvent | null>(null);

  useEffect(() => {
    const handler = (ev: RibbonToastEvent) => {
      setCurrent(ev);
      const t = setTimeout(() => setCurrent(null), 1500);
      return () => clearTimeout(t);
    };
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  const tone = current?.tone ?? "info";
  const bg =
    tone === "success" ? "var(--ds-cane, #6E8C3F)"
    : tone === "warning" ? "var(--ds-ochre, #D4A24C)"
    : tone === "error" ? "var(--color-destructive)"
    : "var(--color-foreground)";

  return (
    <Slide in={current !== null} direction="down" mountOnEnter unmountOnExit>
      <Box
        role="status"
        aria-live="polite"
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1500,
          backgroundColor: bg,
          color: "var(--color-background)",
          px: 3,
          py: 1,
          textAlign: "center",
          fontFamily: "var(--font-caveat)",
          fontSize: "1.1rem",
          letterSpacing: "0.02em",
          borderBottom: "1.5px solid var(--color-foreground)",
        }}
      >
        {current?.message}
      </Box>
    </Slide>
  );
}
```

- [ ] **Step 7: Create `pencil-skeleton.tsx`**

```tsx
import { Box } from "@mui/material";

export function PencilSkeleton({ width = "100%", height = 16 }: { width?: number | string; height?: number | string }) {
  return (
    <Box
      aria-hidden
      sx={{
        width,
        height,
        border: "1.5px dashed var(--color-border)",
        borderRadius: "4px",
        background:
          "repeating-linear-gradient(45deg, transparent 0 6px, rgba(212,162,76,0.08) 6px 7px)",
      }}
    />
  );
}
```

- [ ] **Step 8: Mount `<RibbonToastHost />` once globally**

Edit `web/src/app/layout.tsx`. Inside the `<MuiProvider>` block, add `<RibbonToastHost />` as a sibling to `{children}`:

```tsx
<MuiProvider>
  <AuthProvider>
    <RibbonToastHost />
    {children}
  </AuthProvider>
</MuiProvider>
```

Add the import at the top.

- [ ] **Step 9: Typecheck + commit**

```bash
cd C:/temp/Dodostays/web && npm run typecheck && npm run lint
git -C C:/temp/Dodostays add web/
git -C C:/temp/Dodostays commit -m "feat(web): wizard chrome — JournalStepper, JournalPage, JournalFooter, RibbonToast, PencilSkeleton"
```

---

## Task 5.3: Host wizard step content

**Files:**
- Create: `web/src/app/host/listings/[id]/edit/steps/basics-step.tsx`
- Create: `.../steps/location-step.tsx`
- Create: `.../steps/capacity-step.tsx`
- Create: `.../steps/pricing-step.tsx`
- Create: `.../steps/amenities-step.tsx`
- Create: `.../steps/photos-step.tsx`
- Create: `.../steps/channels-step.tsx`
- Create: `.../steps/publish-step.tsx`

Each step is a small client component receiving the working draft and a `onChange` callback. Field-level validation lives inside each step (MUI `error`/`helperText`). Photos and Channels wrap existing UI verbatim.

(Code blocks for all 8 step files follow at execute-time when this task is dispatched. The general pattern, common to all steps:)

```tsx
"use client";

import { TextField } from "@mui/material";

interface Props {
  draft: ListingDraft;
  onChange: (patch: Partial<ListingDraft>) => void;
}

export function BasicsStep({ draft, onChange }: Props) {
  return (
    <>
      <Field label="Title" note="this is the headline guests see">
        <TextField
          fullWidth
          value={draft.title}
          onChange={(e) => onChange({ title: e.target.value })}
          inputProps={{ maxLength: 200 }}
          error={draft.title.length > 0 && draft.title.length < 3}
          helperText={draft.title.length > 0 && draft.title.length < 3 ? "Title is too short." : ""}
        />
      </Field>
      {/* description, propertyType … */}
    </>
  );
}
```

The `<Field>` wrapper renders the print-style label + Caveat ochre note; deferred to dispatch.

The Photos step is special — it wraps the existing photo-management code from the current edit page (file upload + grid with delete). Channels step wraps `<CopyIcalUrlCard />` + `<ExternalFeedList />`.

The Publish step shows: status badge (Draft / Published), preview link, and either a Publish or Unpublish button. The "Publish" button on this step is the ONE that flips status — it lives in the `<JournalFooter publishLabel="Publish">` slot.

All steps use:
- `<Field label="..." note="...">` for each input — print-caption label, Caveat ochre note
- MUI `TextField`, `Select`, `Slider` (for guests/beds), `Checkbox` for amenities — all themed via the existing MUI theme
- Inline error states (red border + Plex helperText)
- A `PencilSkeleton` placeholder when the listing data is still loading

---

## Task 5.4: Host wizard orchestrator + route refactor

**Files:**
- Create: `web/src/app/host/listings/[id]/edit/wizard.tsx`
- Modify: `web/src/app/host/listings/[id]/edit/page.tsx`

`wizard.tsx` is a client component that:
1. Reads the `?step=` query param (default `basics`)
2. Holds a `draft` of the listing (initialized from the server-rendered listing)
3. Calls `useAutoSave(draft, save)` where `save` PATCHes via `updateListing(...)` with the diff
4. Renders: `<Box display="flex">{stepper}{<JournalPage>{stepContent}</JournalPage>}</Box>` + `<JournalFooter />`
5. `onNext`: `await flush()`; navigate to next step (`router.push(?step=...)`); show ribbon "Saved"
6. `onPublish`: calls `publishListing` (existing API), shows ribbon "Published — `oye, lakaz pou disponib!`"
7. Page-flip animation on step change: a `<Slide direction="left" />` wrapping the step's children. With `prefers-reduced-motion`, fall back to opacity fade

`page.tsx` becomes a thin server component:

```tsx
import { getListing } from "@/lib/listings";
import { Wizard } from "./wizard";

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await getListingForHost(id);   // server-side fetch
  return <Wizard listing={listing} />;
}
```

(`getListingForHost` is already a thing or near-thing in `lib/listings.ts` — adapt to whatever the existing host fetch is. Worst case the `Wizard` client component fetches via `accessToken` after mount.)

---

## Task 5.5: Booking wizard chrome — BoardingPass, Perforation, FlipClock, BoardingStamp + 4 step components

**Files:**
- Create: `web/src/components/booking-wizard/boarding-pass.tsx`
- Create: `web/src/components/booking-wizard/perforation.tsx`
- Create: `web/src/components/booking-wizard/flip-clock.tsx`
- Create: `web/src/components/booking-wizard/boarding-stamp.tsx`
- Create: `web/src/components/booking-wizard/step-1-dates.tsx`
- Create: `web/src/components/booking-wizard/step-2-guests.tsx`
- Create: `web/src/components/booking-wizard/step-3-review.tsx`
- Create: `web/src/components/booking-wizard/step-4-hold-confirm.tsx`

Highlights of the pieces:

- **`Perforation`** — full-width SVG `<line>` with `stroke-dasharray="3 6"` ochre. Optional `animateIn` prop slides a clip-path mask from left to right on first appear (~250ms).
- **`FlipClock`** — pure CSS card-flip animation showing minutes:seconds remaining. Two halves per digit; a 1-second tick rotates the bottom half down to reveal the next digit. Honors `prefers-reduced-motion` (replaces with a static digit + fade).
- **`BoardingStamp`** — SVG ring with "CONFIRMED" Fraunces inside, terracotta with red ink-bleed shadow. Animation: appears at `scale(1.4) rotate(-8deg)`, settles to `scale(1) rotate(-6deg)` over 400ms ease-out. Sound? No — silent.
- **`BoardingPass`** — wraps everything; renders the brand "DODOSTAYS · {listingTitle} · #{shortBookingId}" header in print-style monospaced caps; uses `<Perforation>` between completed sections.
- **Step components** mirror the data flow of the existing booking sidebar — call site stays the same; we just present the steps inside boarding-pass chrome.

---

## Task 5.6: Booking wizard orchestrator — refactor `booking-sidebar.tsx`

**File:**
- Modify: `web/src/app/listings/[id]/booking-sidebar.tsx`

The existing `BookingSidebar` already has the state machine (`picking → checking → blocked → holding → held → confirming → expired`). Refactor it to:

1. Internal step counter `dates → guests → review → confirm`. Step transitions are local state — NOT URL-driven (booking is ephemeral).
2. Wrap content in `<BoardingPass>`; render only the active step's component (other steps shown as greyed placeholders behind active perforations).
3. The "Hold dates" button moves to the end of step 3 (Review). After hold succeeds → step 4 reveals with a `<Perforation animateIn />` and the `<FlipClock>` countdown begins.
4. **Critical:** the "Confirm booking" button must keep `aria-label="Confirm booking"` so the e2e test (`getByRole("button", { name: /^confirm booking$/i })`) still passes — its visible text is "BOARD NOW" but accessibility is preserved.
5. After confirm: render `<BoardingStamp />` for ~600ms before `router.push("/bookings")`.

---

## Task 5.7: e2e + manual verification

**Files:**
- Create: `web/e2e/wizard.spec.ts`

Tests to add (~5):

1. **Host wizard navigates by URL** — `?step=location` lands on Location step; clicking "Save & continue" advances to Capacity (URL changes).
2. **Host wizard auto-saves** — change title; URL still says basics; navigate to a different step; come back; title still has the new value (server round-trip verified).
3. **Host wizard publishes** — last step's "Publish" button calls publish; ribbon shows "Published"; navigating to listing detail anonymously shows the listing.
4. **Booking wizard advances** — pick dates → "Continue" → guests step shows; pick guests → "Continue" → review shows price + total.
5. **Booking flow still passes** — the existing `bookings.spec.ts` still passes with no changes (selectors preserved). Run it after the wizard refactor to confirm.

Run all e2e:

```bash
cd C:/temp/Dodostays/web && npm run test:e2e
```

Expected: 8 tests pass.

---

## Plan 05 — Definition of Done

- [ ] `lib/wizard.ts` + `lib/auto-save.ts` shipped
- [ ] 7 wizard chrome components in `components/wizard/`
- [ ] 4 boarding-pass chrome components + 4 step components in `components/booking-wizard/`
- [ ] 8 host step content components in `app/host/listings/[id]/edit/steps/`
- [ ] Host edit page route is now wizard-driven (`?step=...`)
- [ ] Booking sidebar uses boarding-pass chrome with internal 4-step machine
- [ ] `<RibbonToastHost />` mounted globally; `showRibbon(...)` works from anywhere
- [ ] Auto-save debounced 800ms; "saved Xs ago — mo gardé" indicator updates live
- [ ] All 7 prior e2e tests still pass; 1 new wizard e2e file with ~5 tests; total 8 passing
- [ ] `prefers-reduced-motion` honored on page-flip + flip-clock + boarding-stamp animations
- [ ] No regression in 137 backend tests

**Out of scope (NOT in Plan 05):**
- Drag-to-reorder photos (still single uploads)
- Mobile bottom-sheet variant for the booking wizard (collapses to vertical stack on mobile, but no full-screen modal)
- "Skip to Publish" shortcut from any step
- Saved-as-draft listing list page (already exists at `/host/listings`)
- Real-time collab (host + co-host editing the same listing)
- A11y audit beyond MUI defaults (Plan 06 polish)

## Open Items (deferred)

1. **Per-step undo** — no Ctrl-Z; auto-save is one-way. Plan 06 polish.
2. **Multi-page form abandonment recovery** — if the host closes the tab mid-edit, they lose only the unsynced 800ms window. Acceptable for MVP.
3. **Server-side step validation** — currently the API still accepts a full `UpdateListingRequest` whether the listing is "complete" or not. Step gating is purely client-side for now (host can publish a half-empty listing if they bypass the wizard). Plan 06 polish would add a `ListingValidationService` and gate publish.
4. **Co-host mode** — out of scope.
