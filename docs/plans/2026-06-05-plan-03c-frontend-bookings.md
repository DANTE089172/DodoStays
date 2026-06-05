# DodoStays Plan 03 Section C — Frontend Booking UI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A guest, on a published listing's detail page, picks check-in/check-out dates with an MUI date-range picker → sees a live price breakdown (subtotal + 15% VAT + total) → clicks "Hold dates" → backend creates a 15-minute hold → frontend shows a live countdown → "Confirm booking" button posts to `/api/bookings/confirm` (no payment yet — Plan 04). After confirmation, the guest lands on `/bookings` showing all their bookings. No iCal sync, no payment, no host calendar UI in this section.

**Architecture:**
- New frontend lib `web/src/lib/bookings.ts` — typed API client mirroring the 8 backend endpoints from Section A
- New frontend lib `web/src/lib/dates.ts` — `date-fns`-backed helpers (parse, format, ISO `YYYY-MM-DD`, today)
- New components under `web/src/components/bookings/`: date-range picker (themed MUI), price summary, hold-countdown, booking-card
- Listing detail page (`/listings/[id]`) gets the booking sidebar replaced — picker + summary + Hold button + (when held) countdown + Confirm button
- New `/bookings` route — guest's bookings list using `BookingSummaryDto[]` from `GET /api/bookings/mine`
- `lib/auth-context.tsx` already gives `accessToken` + `user`; no auth-context changes needed
- The MUI hybrid theme from Plan 02b stays; we add `@mui/x-date-pickers` and `date-fns` packages

**Pre-conditions (Section A outputs):**
- `POST /api/bookings/hold`, `POST /api/bookings/confirm`, `GET /api/bookings/mine`, `GET /api/listings/{id}/availability`, `POST /api/bookings/{id}/cancel` all live
- `BookingDto`, `BookingSummaryDto`, `HoldBookingResponse`, `AvailabilityResponse` returned with `BookingState` and `DateRange` as JSON-stringified records
- Backend running at http://localhost:5080 with 124 tests passing
- Frontend Sega & Sand × Cinema Maurice visual system in place
- 5 e2e tests passing

---

## File Structure (this plan adds)

```
web/
├── package.json                                # +@mui/x-date-pickers, +date-fns
├── src/
│   ├── lib/
│   │   ├── bookings.ts                         # NEW — API client + types
│   │   └── dates.ts                            # NEW — helpers
│   ├── components/
│   │   └── bookings/
│   │       ├── booking-date-picker.tsx         # NEW — MUI DateRangePicker themed
│   │       ├── price-summary.tsx               # NEW — nights × rate breakdown card
│   │       ├── hold-countdown.tsx              # NEW — 15-min visual countdown
│   │       └── booking-card.tsx                # NEW — list-item card for /bookings
│   └── app/
│       ├── listings/
│       │   └── [id]/
│       │       └── page.tsx                    # MODIFIED — wires booking sidebar
│       └── bookings/
│           └── page.tsx                        # NEW — guest dashboard
└── e2e/
    └── bookings.spec.ts                        # NEW — Playwright e2e
```

**Constraints (preserve all e2e selectors):**
- Smoke: `getByRole("heading", { name: "DodoStays" })` — preserve any DodoStays h2 already on `/`
- Auth: `getByPlaceholder("Email")`, `getByPlaceholder("Display name")`, `getByPlaceholder("Password (10+ chars, mixed case, digit)")`, `getByText("I'm a host")`, `getByRole("button", { name: /create account/i })`, redirect to `/account` after sign-up
- Listings: `getByRole("link", { name: /manage my listings/i })`, `getByRole("link", { name: /add listing/i })`, `getByRole("button", { name: /save as draft/i })`, `getByRole("button", { name: /^publish$/i })`, `getByText(/^Published$/)`, listing card heading uses `<h3>` with title — KEEP these
- Search: `getByPlaceholder(/Tell us where/i)`, `getByText(/Tap the map to drop an/i)`

**Time-zone rule:** Same as backend. Everything is `DateOnly` in the API → ISO `YYYY-MM-DD` strings on the wire. Frontend uses `date-fns` for arithmetic; never converts to local time. Mauritius is UTC+4 but the booking is date-based, so the day-string on the server matches the day-string on the client regardless of guest timezone.

---

## Task 3C.1: Frontend lib + MUI date pickers install

**Files:**
- Modify: `web/package.json` (add `@mui/x-date-pickers`, `date-fns`)
- Create: `web/src/lib/bookings.ts`
- Create: `web/src/lib/dates.ts`

- [ ] **Step 1: Install packages**

```bash
cd C:/temp/Dodostays/web
npm install @mui/x-date-pickers@^7.23.0 date-fns@^3.6.0 --legacy-peer-deps
```

(`--legacy-peer-deps` matches the pattern used in Plan 02b for MUI v6 vs Next 16 peer-dep mismatch.)

If 7.23.0 isn't available, use `npm install @mui/x-date-pickers date-fns --legacy-peer-deps` to grab whatever resolves. The community edition's `MobileDateRangePicker` may not exist in older versions — if you find that the resolved version doesn't export `MobileDateRangePicker` or `DateRangePicker`, fall back to two side-by-side `DatePicker` instances in Task 3C.2.

- [ ] **Step 2: Create `web/src/lib/dates.ts`**

```ts
import { addDays, differenceInCalendarDays, format, isAfter, isBefore, isValid, parseISO, startOfDay } from "date-fns";

/**
 * Format a Date as ISO YYYY-MM-DD (date-only, no time / timezone).
 * Used to send DateOnly values to the backend.
 */
export function toIsoDate(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

/**
 * Parse an ISO YYYY-MM-DD into a Date (midnight local).
 */
export function fromIsoDate(s: string): Date {
  const d = parseISO(s);
  if (!isValid(d)) throw new Error(`Invalid ISO date: ${s}`);
  return d;
}

/**
 * Today at 00:00 local. Used for "min check-in".
 */
export function today(): Date {
  return startOfDay(new Date());
}

/**
 * Number of nights between checkIn and checkOut (calendar-day diff).
 */
export function nightsBetween(checkIn: Date, checkOut: Date): number {
  return differenceInCalendarDays(checkOut, checkIn);
}

/**
 * Display range: "Mar 14 → Mar 21 (7 nights)"
 */
export function formatRange(checkIn: Date, checkOut: Date): string {
  const nights = nightsBetween(checkIn, checkOut);
  return `${format(checkIn, "MMM d")} → ${format(checkOut, "MMM d")} (${nights} night${nights === 1 ? "" : "s"})`;
}

/**
 * Display a single date in a friendly format: "Mar 14, 2026".
 */
export function formatDate(d: Date): string {
  return format(d, "MMM d, yyyy");
}

/**
 * Format a UTC ISO timestamp into a short readable form: "Jun 15, 14:32".
 */
export function formatDateTime(iso: string): string {
  const d = parseISO(iso);
  return isValid(d) ? format(d, "MMM d, HH:mm") : iso;
}

/**
 * Time remaining until an ISO timestamp, expressed as "{m}m {s}s" or "expired".
 */
export function timeUntil(iso: string, now: Date = new Date()): { ms: number; label: string } {
  const target = parseISO(iso);
  if (!isValid(target)) return { ms: 0, label: "expired" };
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) return { ms: 0, label: "expired" };
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return { ms, label: `${minutes}m ${seconds.toString().padStart(2, "0")}s` };
}

export { addDays, isAfter, isBefore };
```

- [ ] **Step 3: Create `web/src/lib/bookings.ts`**

```ts
import { apiFetch, buildApiUrl } from "./api-client";

export type BookingState = "PendingPayment" | "Confirmed" | "CheckedIn" | "Completed" | "Cancelled" | "Disputed";

export interface DateRange {
  checkIn: string;   // ISO YYYY-MM-DD
  checkOut: string;
}

export interface AvailabilityResponse {
  listingId: string;
  from: string;
  to: string;
  isAvailable: boolean;
  conflictingRanges: DateRange[];
}

export interface HoldBookingResponse {
  bookingId: string;
  state: BookingState;
  dates: DateRange;
  numGuests: number;
  nightlyRateMur: number;
  cleaningFeeMur: number;
  subtotalMur: number;
  vatMur: number;
  totalMur: number;
  holdExpiresAt: string;   // ISO timestamp
}

export interface BookingDto {
  id: string;
  listingId: string;
  listingTitle: string;
  primaryPhotoUrl: string | null;
  guestUserId: string;
  guestDisplayName: string;
  hostUserId: string;
  hostDisplayName: string;
  state: BookingState;
  dates: DateRange;
  numGuests: number;
  nightlyRateMur: number;
  cleaningFeeMur: number;
  subtotalMur: number;
  vatMur: number;
  totalMur: number;
  createdAt: string;
  confirmedAt: string | null;
  checkedInAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
}

export interface BookingSummaryDto {
  id: string;
  listingId: string;
  listingTitle: string;
  primaryPhotoUrl: string | null;
  state: BookingState;
  dates: DateRange;
  totalMur: number;
  createdAt: string;
}

export async function getAvailability(listingId: string, from: string, to: string): Promise<AvailabilityResponse> {
  const sp = new URLSearchParams({ from, to });
  return apiFetch<AvailabilityResponse>(`/api/listings/${listingId}/availability?${sp.toString()}`);
}

export async function holdBooking(
  accessToken: string,
  listingId: string,
  checkIn: string,
  checkOut: string,
  numGuests: number,
): Promise<HoldBookingResponse> {
  const res = await fetch(buildApiUrl("/api/bookings/hold"), {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ listingId, checkIn, checkOut, numGuests }),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<HoldBookingResponse>;
}

export async function confirmBooking(
  accessToken: string,
  bookingId: string,
  paymentReference?: string,
): Promise<BookingDto> {
  const res = await fetch(buildApiUrl("/api/bookings/confirm"), {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ bookingId, paymentReference: paymentReference ?? null }),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<BookingDto>;
}

export async function cancelBooking(
  accessToken: string,
  bookingId: string,
  reason?: string,
): Promise<BookingDto> {
  const res = await fetch(buildApiUrl(`/api/bookings/${bookingId}/cancel`), {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ reason: reason ?? null }),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<BookingDto>;
}

export async function getMyBookings(accessToken: string): Promise<BookingSummaryDto[]> {
  const res = await fetch(buildApiUrl("/api/bookings/mine"), {
    credentials: "include",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<BookingSummaryDto[]>;
}
```

- [ ] **Step 4: Typecheck + lint + e2e regression**

```bash
cd C:/temp/Dodostays/web && npm run typecheck && npm run lint && npm run test:e2e
```

Expected: 0 errors. The 5 existing e2e tests still pass — this task only adds packages + lib files, no UI changes.

- [ ] **Step 5: Commit**

```bash
git -C C:/temp/Dodostays add web/
git -C C:/temp/Dodostays commit -m "feat(web): bookings API client + dates helper + @mui/x-date-pickers install"
```

## Self-review

- 2 new lib files (`bookings.ts`, `dates.ts`)
- `package.json` + `package-lock.json` updated
- All 5 e2e still pass
- Typecheck + lint clean
- One new commit

---

## Task 3C.2: Booking date-range picker + price summary + hold countdown components

**Files:**
- Create: `web/src/components/bookings/booking-date-picker.tsx`
- Create: `web/src/components/bookings/price-summary.tsx`
- Create: `web/src/components/bookings/hold-countdown.tsx`

These are reusable client components. They DO NOT yet appear in any page — Task 3C.3 wires them into the listing detail.

- [ ] **Step 1: Create `web/src/components/bookings/booking-date-picker.tsx`**

The MUI Date Range Picker requires a `LocalizationProvider` ancestor. We'll create one INSIDE this component so callers don't need to know.

```tsx
"use client";

import { useState } from "react";
import { Box, TextField } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFnsV3";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { isAfter, isBefore, today, toIsoDate } from "@/lib/dates";

interface Props {
  initialCheckIn?: string | null;
  initialCheckOut?: string | null;
  minStayNights?: number;
  onChange: (range: { checkIn: string | null; checkOut: string | null }) => void;
}

export function BookingDatePicker({ initialCheckIn = null, initialCheckOut = null, minStayNights = 1, onChange }: Props) {
  const [checkIn, setCheckIn] = useState<Date | null>(initialCheckIn ? new Date(initialCheckIn) : null);
  const [checkOut, setCheckOut] = useState<Date | null>(initialCheckOut ? new Date(initialCheckOut) : null);

  function update(next: { checkIn: Date | null; checkOut: Date | null }) {
    setCheckIn(next.checkIn);
    setCheckOut(next.checkOut);
    onChange({
      checkIn: next.checkIn ? toIsoDate(next.checkIn) : null,
      checkOut: next.checkOut ? toIsoDate(next.checkOut) : null,
    });
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
        <DatePicker
          label="Check in"
          value={checkIn}
          minDate={today()}
          maxDate={checkOut ?? undefined}
          onChange={(d) => {
            // If user moves check-in past existing check-out, clear check-out
            const nextCheckOut = d && checkOut && !isBefore(d, checkOut) ? null : checkOut;
            update({ checkIn: d, checkOut: nextCheckOut });
          }}
          slotProps={{
            textField: {
              size: "small",
              fullWidth: true,
              sx: { fontFamily: "var(--font-plex)" },
            },
          }}
        />
        <DatePicker
          label="Check out"
          value={checkOut}
          minDate={checkIn ? new Date(checkIn.getTime() + minStayNights * 24 * 60 * 60 * 1000) : today()}
          onChange={(d) => {
            // If user picks check-out before check-in, swap
            if (d && checkIn && isAfter(checkIn, d)) {
              update({ checkIn: d, checkOut: checkIn });
            } else {
              update({ checkIn, checkOut: d });
            }
          }}
          slotProps={{
            textField: {
              size: "small",
              fullWidth: true,
              sx: { fontFamily: "var(--font-plex)" },
            },
          }}
        />
      </Box>
    </LocalizationProvider>
  );
}
```

NOTE: `@mui/x-date-pickers/AdapterDateFnsV3` is the import path for date-fns v3. If v3 isn't installed (we resolved it in Task 3C.1), use `AdapterDateFns` instead. If the build complains about an `AdapterDateFnsV3` import not existing, switch to:

```ts
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
```

- [ ] **Step 2: Create `web/src/components/bookings/price-summary.tsx`**

```tsx
"use client";

import { Box, Divider, Stack, Typography } from "@mui/material";
import { nightsBetween } from "@/lib/dates";

interface Props {
  checkIn: Date | null;
  checkOut: Date | null;
  nightlyMur: number;
  cleaningMur: number;
}

const VAT_RATE = 0.15;

export function PriceSummary({ checkIn, checkOut, nightlyMur, cleaningMur }: Props) {
  if (!checkIn || !checkOut) {
    return (
      <Box sx={{ color: "var(--color-muted-foreground)", fontFamily: "var(--font-plex)", fontSize: "0.875rem", py: 1 }}>
        Pick check-in and check-out dates to see total.
      </Box>
    );
  }

  const nights = nightsBetween(checkIn, checkOut);
  if (nights <= 0) return null;

  const nightlySubtotal = nightlyMur * nights;
  const subtotal = nightlySubtotal + cleaningMur;
  const vat = Math.round(subtotal * VAT_RATE * 100) / 100;
  const total = subtotal + vat;

  return (
    <Stack spacing={1} sx={{ py: 1, fontFamily: "var(--font-plex)", fontSize: "0.875rem" }}>
      <Row label={`MUR ${nightlyMur.toLocaleString()} × ${nights} night${nights === 1 ? "" : "s"}`} value={`MUR ${nightlySubtotal.toLocaleString()}`} />
      {cleaningMur > 0 && <Row label="Cleaning fee" value={`MUR ${cleaningMur.toLocaleString()}`} />}
      <Row label="VAT (15%)" value={`MUR ${vat.toLocaleString()}`} />
      <Divider sx={{ borderColor: "var(--color-border)" }} />
      <Row label="Total" value={`MUR ${total.toLocaleString()}`} bold />
    </Stack>
  );
}

function Row({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
      <Typography sx={{ fontFamily: "inherit", fontSize: "inherit", fontWeight: bold ? 600 : 400 }}>{label}</Typography>
      <Typography sx={{ fontFamily: "inherit", fontSize: "inherit", fontWeight: bold ? 600 : 400 }}>{value}</Typography>
    </Box>
  );
}
```

- [ ] **Step 3: Create `web/src/components/bookings/hold-countdown.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { Box, LinearProgress, Typography } from "@mui/material";
import { timeUntil } from "@/lib/dates";

interface Props {
  expiresAt: string;          // ISO timestamp
  totalMs?: number;           // for progress bar; default 15 minutes
  onExpire?: () => void;
}

export function HoldCountdown({ expiresAt, totalMs = 15 * 60 * 1000, onExpire }: Props) {
  const [{ ms, label }, setState] = useState(() => timeUntil(expiresAt));

  useEffect(() => {
    const interval = setInterval(() => {
      const next = timeUntil(expiresAt);
      setState(next);
      if (next.ms <= 0 && onExpire) onExpire();
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  const expired = ms <= 0;
  const percent = expired ? 0 : Math.max(0, Math.min(100, (ms / totalMs) * 100));

  return (
    <Box
      sx={{
        border: "1.5px solid var(--color-border)",
        borderRadius: "6px",
        p: 1.5,
        backgroundColor: "var(--color-card)",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography sx={{ fontFamily: "var(--font-plex)", fontSize: "0.8rem", letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--color-muted-foreground)" }}>
          {expired ? "Hold expired" : "Hold expires in"}
        </Typography>
        <Typography sx={{ fontFamily: "var(--font-plex)", fontSize: "1rem", fontWeight: 600, color: expired ? "var(--color-destructive)" : "var(--color-foreground)" }}>
          {expired ? "—" : label}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={percent}
        sx={{
          height: 4,
          borderRadius: 2,
          backgroundColor: "var(--color-muted)",
          "& .MuiLinearProgress-bar": {
            backgroundColor: expired ? "var(--color-destructive)" : "var(--color-accent)",
          },
        }}
      />
    </Box>
  );
}
```

- [ ] **Step 4: Typecheck + lint**

```bash
cd C:/temp/Dodostays/web && npm run typecheck && npm run lint
```

Expected: clean. Common issues to fix:
- If `AdapterDateFnsV3` import path errors, switch to `AdapterDateFns`.
- If MUI date pickers complain about peer types, the install in Task 3C.1 needs `--legacy-peer-deps`.

DO NOT run e2e in this task — components aren't on any page yet.

- [ ] **Step 5: Commit**

```bash
git -C C:/temp/Dodostays add web/
git -C C:/temp/Dodostays commit -m "feat(web): booking date-picker + price-summary + hold-countdown components"
```

## Self-review

- 3 new components in `web/src/components/bookings/`
- Typecheck + lint clean
- One new commit

---

## Task 3C.3: Wire booking sidebar into listing detail page

**File:**
- Modify: `web/src/app/listings/[id]/page.tsx`

The listing detail page currently has a sticky right-rail booking sidebar with the placeholder text "Booking will be available soon". This task replaces it with the real booking flow:

1. Show date pickers + price summary (live recalculates as dates change)
2. "Hold dates" button — POSTs to `/api/bookings/hold`, expects `HoldBookingResponse`
3. After hold, switch to "held" mode: show countdown + "Confirm booking" button + "Cancel" button
4. "Confirm booking" → POSTs to `/api/bookings/confirm`, redirects to `/bookings`
5. If user is not signed in, "Hold dates" button instead links to `/signin?next=/listings/{id}`

Unlike previous detail-page pieces, this section MUST be a client component because it has state, mutations, and auth-token access.

- [ ] **Step 1: Refactor `web/src/app/listings/[id]/page.tsx`**

The page is currently a server component that fetches the listing. The booking sidebar needs to be a CHILD client component, leaving the page as server-side. Read the current file to understand the layout, then split:

1. Keep the page (`page.tsx`) as a server component
2. Create a NEW sibling client component `web/src/app/listings/[id]/booking-sidebar.tsx` and use it from `page.tsx`

`web/src/app/listings/[id]/booking-sidebar.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Alert, Box, Button, MenuItem, Select, Snackbar, Stack, Typography } from "@mui/material";
import { useAuth } from "@/lib/auth-context";
import { BookingDatePicker } from "@/components/bookings/booking-date-picker";
import { PriceSummary } from "@/components/bookings/price-summary";
import { HoldCountdown } from "@/components/bookings/hold-countdown";
import { confirmBooking, getAvailability, holdBooking, type HoldBookingResponse } from "@/lib/bookings";

interface Props {
  listingId: string;
  nightlyMur: number;
  cleaningMur: number;
  maxGuests: number;
  minStayNights: number;
}

type State =
  | { kind: "picking" }
  | { kind: "checking" }
  | { kind: "blocked"; reason: string }
  | { kind: "holding" }
  | { kind: "held"; hold: HoldBookingResponse }
  | { kind: "confirming" }
  | { kind: "expired" };

export function BookingSidebar({ listingId, nightlyMur, cleaningMur, maxGuests, minStayNights }: Props) {
  const router = useRouter();
  const { user, accessToken } = useAuth();
  const [state, setState] = useState<State>({ kind: "picking" });
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);
  const [numGuests, setNumGuests] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Re-check availability whenever the user changes dates
  useEffect(() => {
    if (!checkIn || !checkOut) return;
    let cancelled = false;
    setState({ kind: "checking" });
    getAvailability(listingId, checkIn, checkOut)
      .then((res) => {
        if (cancelled) return;
        if (!res.isAvailable) {
          setState({ kind: "blocked", reason: "Dates already booked. Pick different dates." });
        } else {
          setState({ kind: "picking" });
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setState({ kind: "blocked", reason: (e as Error).message });
      });
    return () => { cancelled = true; };
  }, [listingId, checkIn, checkOut]);

  async function onHoldDates() {
    if (!checkIn || !checkOut || !accessToken) return;
    setError(null);
    setState({ kind: "holding" });
    try {
      const hold = await holdBooking(accessToken, listingId, checkIn, checkOut, numGuests);
      setState({ kind: "held", hold });
    } catch (e) {
      setError((e as Error).message);
      setState({ kind: "picking" });
    }
  }

  async function onConfirm() {
    if (state.kind !== "held" || !accessToken) return;
    setError(null);
    setState({ kind: "confirming" });
    try {
      await confirmBooking(accessToken, state.hold.bookingId);
      router.push("/bookings");
    } catch (e) {
      setError((e as Error).message);
      setState({ kind: "held", hold: state.hold });
    }
  }

  function onExpire() {
    setState({ kind: "expired" });
  }

  function reset() {
    setState({ kind: "picking" });
    setCheckIn(null);
    setCheckOut(null);
  }

  const datesValid = !!(checkIn && checkOut);

  return (
    <Box
      component="aside"
      sx={{
        position: { lg: "sticky" },
        top: { lg: 24 },
        border: "1.5px solid var(--color-border)",
        borderRadius: "12px",
        p: 3,
        backgroundColor: "var(--color-card)",
        boxShadow: "var(--shadow-card-hover, 0 1px 2px rgba(20,12,8,0.06), 0 4px 16px rgba(20,12,8,0.06))",
      }}
    >
      <Stack spacing={2}>
        <Box>
          <Typography component="span" sx={{ fontFamily: "var(--font-fraunces)", fontSize: "2rem", fontWeight: 600 }}>
            MUR {nightlyMur.toLocaleString()}
          </Typography>
          <Typography component="span" sx={{ fontFamily: "var(--font-plex)", fontSize: "0.875rem", color: "var(--color-muted-foreground)", ml: 1 }}>
            / night
          </Typography>
        </Box>

        {state.kind === "expired" && (
          <Alert severity="warning" variant="outlined" sx={{ fontFamily: "var(--font-plex)" }}>
            Hold expired. Pick dates again to retry.
          </Alert>
        )}

        {(state.kind === "picking" || state.kind === "checking" || state.kind === "blocked" || state.kind === "expired") && (
          <>
            <BookingDatePicker
              initialCheckIn={checkIn}
              initialCheckOut={checkOut}
              minStayNights={minStayNights}
              onChange={({ checkIn, checkOut }) => {
                setCheckIn(checkIn);
                setCheckOut(checkOut);
              }}
            />
            <Box>
              <Typography sx={{ fontFamily: "var(--font-plex)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-muted-foreground)", mb: 0.5 }}>
                Guests
              </Typography>
              <Select
                size="small"
                fullWidth
                value={numGuests}
                onChange={(e) => setNumGuests(Number(e.target.value))}
                sx={{ fontFamily: "var(--font-plex)" }}
              >
                {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
                  <MenuItem key={n} value={n}>{n} guest{n === 1 ? "" : "s"}</MenuItem>
                ))}
              </Select>
            </Box>
            <PriceSummary
              checkIn={checkIn ? new Date(checkIn) : null}
              checkOut={checkOut ? new Date(checkOut) : null}
              nightlyMur={nightlyMur}
              cleaningMur={cleaningMur}
            />
            {state.kind === "blocked" && (
              <Alert severity="info" variant="outlined" sx={{ fontFamily: "var(--font-plex)" }}>{state.reason}</Alert>
            )}
            {!user ? (
              <Button
                component={Link}
                href={`/signin?next=/listings/${listingId}`}
                variant="contained"
                color="primary"
                size="large"
                fullWidth
              >
                Sign in to book
              </Button>
            ) : (
              <Button
                onClick={onHoldDates}
                disabled={!datesValid || state.kind === "checking" || state.kind === "blocked" || state.kind === "holding"}
                variant="contained"
                color="primary"
                size="large"
                fullWidth
              >
                {state.kind === "holding" ? "Holding…" : "Hold dates"}
              </Button>
            )}
          </>
        )}

        {state.kind === "held" && (
          <>
            <PriceSummary
              checkIn={state.hold.dates.checkIn ? new Date(state.hold.dates.checkIn) : null}
              checkOut={state.hold.dates.checkOut ? new Date(state.hold.dates.checkOut) : null}
              nightlyMur={state.hold.nightlyRateMur}
              cleaningMur={state.hold.cleaningFeeMur}
            />
            <HoldCountdown expiresAt={state.hold.holdExpiresAt} onExpire={onExpire} />
            <Button onClick={onConfirm} variant="contained" color="primary" size="large" fullWidth>
              Confirm booking
            </Button>
            <Button onClick={reset} variant="text" size="small" color="secondary">
              Pick different dates
            </Button>
            <Typography sx={{ fontFamily: "var(--font-plex)", fontSize: "0.75rem", color: "var(--color-muted-foreground)", textAlign: "center" }}>
              Payment will be wired in Plan 04. For now, "Confirm" finalizes without charging.
            </Typography>
          </>
        )}

        {state.kind === "confirming" && (
          <Alert severity="info" variant="outlined" sx={{ fontFamily: "var(--font-plex)" }}>
            Confirming booking…
          </Alert>
        )}
      </Stack>

      <Snackbar
        open={error !== null}
        autoHideDuration={5000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="error" onClose={() => setError(null)} sx={{ fontFamily: "var(--font-plex)" }}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
}
```

- [ ] **Step 2: Modify `web/src/app/listings/[id]/page.tsx`**

Read the current file. Find the existing booking sidebar (a `<aside>` with the price + "Booking will be available soon" text). Replace its body with `<BookingSidebar ... />`.

Approximate change:

1. Add at the top: `import { BookingSidebar } from "./booking-sidebar";`
2. Find the sidebar section (the `<aside>` after the amenities section)
3. Replace the entire `<aside>` body with:

```tsx
<BookingSidebar
  listingId={listing.id}
  nightlyMur={listing.nightlyRateMur}
  cleaningMur={listing.cleaningFeeMur}
  maxGuests={listing.maxGuests}
  minStayNights={listing.minStayNights}
/>
```

(If the sidebar wrapper had its own border + radius styling, REMOVE that — `BookingSidebar` brings its own.)

The rest of the page (hero photo, amenities, host info) stays unchanged.

- [ ] **Step 3: Typecheck + lint**

```bash
cd C:/temp/Dodostays/web && npm run typecheck && npm run lint
```

Expected: clean.

- [ ] **Step 4: Manual smoke test (do not run e2e yet — that's Task 3C.4)**

Start backend if not running, then frontend:

```bash
cd C:/temp/Dodostays/web && npm run dev
```

Open http://localhost:3000/listings, click any listing → on the detail page, you should see the new booking sidebar with date pickers + price calculation + Hold button. **Don't actually hold a booking yet** — Task 3C.4 includes the e2e that exercises the full flow.

- [ ] **Step 5: Commit**

```bash
git -C C:/temp/Dodostays add web/
git -C C:/temp/Dodostays commit -m "feat(web): wire booking sidebar into listing detail page"
```

## Self-review

- New file: `booking-sidebar.tsx` (client component, owns booking state machine on the FE)
- Modified: `listings/[id]/page.tsx` (uses `<BookingSidebar />`)
- Typecheck + lint clean
- One new commit

---

## Task 3C.4: Guest bookings dashboard at `/bookings` + Playwright e2e + manual verification

**Files:**
- Create: `web/src/components/bookings/booking-card.tsx`
- Create: `web/src/app/bookings/page.tsx`
- Create: `web/e2e/bookings.spec.ts`
- Modify: `web/src/components/site-header.tsx` (add "Bookings" link when signed in)

- [ ] **Step 1: Create `web/src/components/bookings/booking-card.tsx`**

```tsx
"use client";

import Link from "next/link";
import { Box, Chip, Stack, Typography } from "@mui/material";
import type { BookingState, BookingSummaryDto } from "@/lib/bookings";
import { formatDate, fromIsoDate } from "@/lib/dates";

interface Props {
  booking: BookingSummaryDto;
}

const STATE_COLOR: Record<BookingState, "default" | "primary" | "success" | "warning" | "error" | "info"> = {
  PendingPayment: "warning",
  Confirmed: "primary",
  CheckedIn: "info",
  Completed: "success",
  Cancelled: "error",
  Disputed: "error",
};

const STATE_LABEL: Record<BookingState, string> = {
  PendingPayment: "Pending payment",
  Confirmed: "Confirmed",
  CheckedIn: "Checked in",
  Completed: "Completed",
  Cancelled: "Cancelled",
  Disputed: "Disputed",
};

export function BookingCard({ booking }: Props) {
  const checkIn = fromIsoDate(booking.dates.checkIn);
  const checkOut = fromIsoDate(booking.dates.checkOut);

  return (
    <Box
      component="li"
      sx={{
        display: "flex",
        gap: 2,
        p: 2,
        border: "1.5px solid var(--color-border)",
        borderRadius: "12px",
        backgroundColor: "var(--color-card)",
        "&:hover": { boxShadow: "var(--shadow-card-hover, 0 1px 2px rgba(20,12,8,0.06), 0 4px 16px rgba(20,12,8,0.06))" },
        transition: "box-shadow 200ms ease-out",
      }}
    >
      <Box sx={{ width: 140, aspectRatio: "4/3", borderRadius: "8px", overflow: "hidden", flexShrink: 0, backgroundColor: "var(--color-muted)" }}>
        {booking.primaryPhotoUrl && (
          <img src={booking.primaryPhotoUrl} alt={booking.listingTitle} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        )}
      </Box>
      <Stack sx={{ flex: 1, minWidth: 0 }} spacing={0.5}>
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
          <Link href={`/listings/${booking.listingId}`} style={{ textDecoration: "none", color: "inherit", flex: 1 }}>
            <Typography component="h3" sx={{ fontFamily: "var(--font-fraunces)", fontWeight: 600, fontSize: "1.125rem", lineHeight: 1.25, "&:hover": { textDecoration: "underline" } }}>
              {booking.listingTitle}
            </Typography>
          </Link>
          <Chip label={STATE_LABEL[booking.state]} color={STATE_COLOR[booking.state]} size="small" />
        </Box>
        <Typography sx={{ fontFamily: "var(--font-plex)", fontSize: "0.875rem", color: "var(--color-muted-foreground)" }}>
          {formatDate(checkIn)} → {formatDate(checkOut)}
        </Typography>
        <Typography sx={{ fontFamily: "var(--font-plex)", fontSize: "0.875rem", fontWeight: 600 }}>
          MUR {booking.totalMur.toLocaleString()}
        </Typography>
      </Stack>
    </Box>
  );
}
```

- [ ] **Step 2: Create `web/src/app/bookings/page.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Alert, Box, Skeleton, Stack, Typography } from "@mui/material";
import { useAuth } from "@/lib/auth-context";
import { getMyBookings, type BookingSummaryDto } from "@/lib/bookings";
import { BookingCard } from "@/components/bookings/booking-card";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function BookingsPage() {
  const router = useRouter();
  const { user, accessToken, loading } = useAuth();
  const [items, setItems] = useState<BookingSummaryDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/signin?next=/bookings");
  }, [loading, user, router]);

  useEffect(() => {
    if (!accessToken) return;
    setItems(null);
    getMyBookings(accessToken)
      .then(setItems)
      .catch((e) => setError((e as Error).message));
  }, [accessToken]);

  if (loading || !user) return <main className="p-8">Loading…</main>;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <header className="mb-6">
          <h1 className="font-display text-4xl">Your bookings</h1>
          <p className="font-script text-lg text-[var(--ds-ochre,_#D4A24C)]">to bann sezir</p>
        </header>

        {error && <Alert severity="error" sx={{ mb: 2, fontFamily: "var(--font-plex)" }}>{error}</Alert>}

        {items === null && (
          <Stack spacing={2}>
            {[1, 2].map((i) => <Skeleton key={i} variant="rectangular" height={130} sx={{ borderRadius: "12px" }} />)}
          </Stack>
        )}

        {items !== null && items.length === 0 && (
          <Box sx={{ textAlign: "center", py: 6, border: "1.5px dashed var(--color-border)", borderRadius: "12px" }}>
            <Typography sx={{ fontFamily: "var(--font-caveat)", fontSize: "1.5rem", color: "var(--color-muted-foreground)" }}>
              ou pa enkor reserve…
            </Typography>
            <Typography sx={{ mt: 1, fontFamily: "var(--font-plex)", fontSize: "0.875rem", color: "var(--color-muted-foreground)" }}>
              You haven&apos;t booked anything yet.{" "}
              <Link href="/listings" className="underline">Browse stays</Link>
            </Typography>
          </Box>
        )}

        {items !== null && items.length > 0 && (
          <Box component="ul" sx={{ listStyle: "none", p: 0, m: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            {items.map((b) => <BookingCard key={b.id} booking={b} />)}
          </Box>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
```

- [ ] **Step 3: Modify `web/src/components/site-header.tsx`**

Read the file. The header conditionally renders `Sign in / Sign up` when no user, and `Account / Sign out` when signed in. Find the signed-in branch and add a "Bookings" link BEFORE "Account":

```tsx
<Link href="/bookings" className="...same classes as the existing nav links...">Bookings</Link>
```

If the file doesn't have a signed-in nav (it just shows Account button or the user's name), add a "Bookings" link near the Account link with the same styling.

- [ ] **Step 4: Create `web/e2e/bookings.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

const apiBase = process.env.E2E_API_BASE ?? "http://localhost:5080";

test.beforeAll(async ({ request }) => {
  let reachable = false;
  try {
    const res = await request.get(`${apiBase}/health/live`);
    reachable = res.ok();
  } catch { reachable = false; }
  test.skip(!reachable, "Backend API not reachable on " + apiBase);
});

test("guest can hold + confirm a booking and see it in /bookings", async ({ page }) => {
  // 1. Create a host + a published listing via API directly (faster than UI)
  const hostEmail = `host-bk-${Date.now()}@test.dodostays.local`;
  const guestEmail = `guest-bk-${Date.now()}@test.dodostays.local`;
  const password = "Aa1!aaaaaa";

  const hostSignup = await page.request.post(`${apiBase}/api/identity/signup`, {
    data: { email: hostEmail, password, displayName: "Host BK", preferredLanguage: "en", intendedRole: "Host" },
  });
  expect(hostSignup.ok()).toBeTruthy();
  const hostAuth = await hostSignup.json();
  const hostToken = hostAuth.accessToken;

  const createListing = await page.request.post(`${apiBase}/api/listings`, {
    headers: { Authorization: `Bearer ${hostToken}` },
    data: {
      title: `Booking Test Villa ${Date.now()}`,
      description: "A test villa for booking e2e.",
      propertyType: "Villa",
      region: "flic-en-flac",
      addressLine: "12 Coral Lane",
      latitude: -20.27,
      longitude: 57.36,
      bedrooms: 3,
      beds: 4,
      bathrooms: 2,
      maxGuests: 6,
      nightlyRateMur: 4500,
      cleaningFeeMur: 600,
      minStayNights: 2,
      amenities: ["Pool", "Wifi"],
    },
  });
  expect(createListing.ok()).toBeTruthy();
  const listing = await createListing.json();

  const publish = await page.request.post(`${apiBase}/api/listings/${listing.id}/publish`, {
    headers: { Authorization: `Bearer ${hostToken}` },
  });
  expect(publish.ok()).toBeTruthy();

  // 2. Sign up as a guest in the browser (not via API — we need the auth-cookie + app state)
  await page.goto("/signup");
  await page.getByText("I'm a guest").click();
  await page.getByPlaceholder("Email").fill(guestEmail);
  await page.getByPlaceholder("Display name").fill("Guest BK");
  await page.getByPlaceholder("Password (10+ chars, mixed case, digit)").fill(password);
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/account$/);

  // 3. Open the listing detail page
  await page.goto(`/listings/${listing.id}`);

  // 4. Pick check-in (60 days out) and check-out (3 nights later)
  const checkIn = new Date();
  checkIn.setDate(checkIn.getDate() + 60);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 3);
  const fmt = (d: Date) => `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")}/${d.getFullYear()}`;

  // The MUI DatePicker text inputs accept MM/DD/YYYY in the default en-US locale
  const checkInInput = page.getByLabel("Check in");
  await checkInInput.click();
  await checkInInput.fill(fmt(checkIn));
  await page.keyboard.press("Escape");

  const checkOutInput = page.getByLabel("Check out");
  await checkOutInput.click();
  await checkOutInput.fill(fmt(checkOut));
  await page.keyboard.press("Escape");

  // 5. Hold dates
  await page.getByRole("button", { name: /^hold dates$/i }).click();

  // 6. Confirm
  await expect(page.getByRole("button", { name: /^confirm booking$/i })).toBeVisible({ timeout: 10000 });
  await page.getByRole("button", { name: /^confirm booking$/i }).click();

  // 7. Land on /bookings, see the new booking
  await expect(page).toHaveURL(/\/bookings$/);
  await expect(page.getByRole("heading", { name: listing.title })).toBeVisible({ timeout: 10000 });
});
```

NOTE: MUI's `DatePicker` text input is wrapped in a label-associated `<input>`; `page.getByLabel("Check in")` should resolve. If it doesn't, fallback selectors:
- `page.locator('input[placeholder="MM/DD/YYYY"]').nth(0)` for check-in
- `page.locator('input[placeholder="MM/DD/YYYY"]').nth(1)` for check-out

If the DatePicker requires opening a calendar popper instead of typing, the test should be adjusted to click date cells. Try the typed-input approach FIRST — it's simpler and works for most MUI v6 + date-fns setups.

- [ ] **Step 5: Run all e2e tests**

Backend MUST be running.

```bash
cd C:/temp/Dodostays/web && npm run test:e2e
```

Expected: 6 tests pass — smoke + auth + listings + 2 search + 1 booking. If the booking test fails on the date-picker selector, adapt as noted above. If it fails on the price summary or hold button, fix the page.

- [ ] **Step 6: Commit**

```bash
git -C C:/temp/Dodostays add web/
git -C C:/temp/Dodostays commit -m "feat(web): /bookings dashboard + booking-card + e2e booking flow test"
```

## Self-review

- 1 new component (`booking-card.tsx`)
- 1 new page (`/bookings`)
- 1 new e2e test (`bookings.spec.ts`)
- `site-header.tsx` has Bookings link
- All 6 e2e pass
- One new commit

---

## Section C — Definition of Done

- [ ] `lib/bookings.ts` API client + `lib/dates.ts` helpers
- [ ] `@mui/x-date-pickers` + `date-fns` installed
- [ ] `BookingDatePicker`, `PriceSummary`, `HoldCountdown`, `BookingCard` components
- [ ] Listing detail page wires booking sidebar with full state machine (picking → checking → blocked → holding → held → confirming → expired)
- [ ] `/bookings` route shows guest's bookings using `BookingSummaryDto[]`
- [ ] Site header gains "Bookings" link when signed in
- [ ] Playwright `bookings.spec.ts` passes end-to-end (host creates listing → guest holds → confirms → sees on /bookings)
- [ ] All 6 e2e tests green
- [ ] Manual browser verification: a guest can pick dates, see live price + VAT, hold for 15 min, confirm, land on /bookings

**Out of scope (NOT in Section C):**
- Cancel-with-confirmation dialog (button is on the BookingDto endpoint already; UI in Plan 06 polish)
- Host calendar UI (Section B + future plan)
- iCal sync (Section B)
- Real payment capture (Plan 04)
- Booking confirmation emails (Plan 04 — Resend)
- Money-back claim flow (Plan 05)

## Open Items (deferred)

1. **Date locale** — currently MUI uses en-US (`MM/DD/YYYY`). Mauritian users expect `DD/MM/YYYY`. Localization swap goes in Plan 06 polish (involves importing `enGB` from `date-fns/locale` and passing as `adapterLocale` to `LocalizationProvider`).
2. **Cancellation policies** — the spec mentions standard / moderate / strict. Currently "cancel" just succeeds. Tying refund logic to date-of-cancel happens in Plan 04 (where money exists).
3. **Mobile date-range UX** — MUI's `MobileDateRangePicker` would be nicer on phones; we use side-by-side `DatePicker` for simplicity. Plan 06 polish.
4. **Booking detail page (`/bookings/[id]`)** — currently the dashboard cards link to the listing, not the booking. A real booking detail page (with cancel button, host contact, receipt download) lands in Plan 04.
