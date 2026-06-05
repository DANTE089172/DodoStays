"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getMyBookings, type BookingState, type BookingSummaryDto } from "@/lib/bookings";
import { fromIsoDate, today } from "@/lib/dates";
import { BookingCard } from "@/components/bookings/booking-card";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Section } from "@/components/marketing/section";
import { Eyebrow } from "@/components/marketing/eyebrow";
import { DisplayHeading } from "@/components/marketing/display-heading";
import { Lede } from "@/components/marketing/lede";
import { pillButtonClasses } from "@/components/marketing/pill-button";
import { cn } from "@/lib/utils";

type Filter = "all" | "upcoming" | "past" | "cancelled";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
  { id: "cancelled", label: "Cancelled" },
];

const CANCELLED_STATES: BookingState[] = ["Cancelled", "Disputed"];

function bookingBucket(b: BookingSummaryDto): "upcoming" | "past" | "cancelled" {
  if (CANCELLED_STATES.includes(b.state)) return "cancelled";
  const checkOut = fromIsoDate(b.dates.checkOut);
  return checkOut.getTime() >= today().getTime() ? "upcoming" : "past";
}

export default function BookingsPage() {
  const router = useRouter();
  const { user, accessToken, loading } = useAuth();
  const [items, setItems] = useState<BookingSummaryDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    if (!loading && !user) router.replace("/signin?next=/bookings");
  }, [loading, user, router]);

  useEffect(() => {
    if (!accessToken) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(null);
    getMyBookings(accessToken)
      .then(setItems)
      .catch((e) => setError((e as Error).message));
  }, [accessToken]);

  const filtered = useMemo(() => {
    if (items === null) return null;
    if (filter === "all") return items;
    return items.filter((b) => bookingBucket(b) === filter);
  }, [items, filter]);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8 text-sm text-[var(--color-muted-foreground)]">
        Loading…
      </main>
    );
  }

  return (
    <>
      <SiteHeader />
      <Section tone="cream" size="sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <Eyebrow>Your trips</Eyebrow>
            <DisplayHeading level={2} className="mt-3">
              Bookings
            </DisplayHeading>
          </div>
          <div
            role="tablist"
            aria-label="Filter bookings"
            className="flex flex-wrap items-center gap-x-1 gap-y-1 border-b border-[color-mix(in_srgb,var(--color-foreground)_12%,transparent)]"
          >
            {FILTERS.map((f) => {
              const active = filter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    "ds-eyebrow relative -mb-px px-4 py-3 transition-colors duration-150",
                    active
                      ? "text-[var(--color-foreground)]"
                      : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]",
                  )}
                >
                  {f.label}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-x-2 bottom-0 h-[2px] rounded-full transition-colors duration-150",
                      active ? "bg-[var(--color-primary)]" : "bg-transparent",
                    )}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </Section>

      <main className="mx-auto w-full max-w-7xl px-6 py-10 sm:px-10 sm:py-14">
        {error && (
          <p
            role="alert"
            className="mb-6 rounded-md border border-[color-mix(in_srgb,var(--color-destructive)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-destructive)_5%,transparent)] px-4 py-3 text-sm text-[var(--color-destructive)]"
          >
            {error}
          </p>
        )}

        {items === null && (
          <ul className="flex flex-col gap-4">
            {[1, 2].map((i) => (
              <li
                key={i}
                aria-hidden
                className="h-[160px] animate-pulse rounded-xl border border-[color-mix(in_srgb,var(--color-foreground)_10%,transparent)] bg-[color-mix(in_srgb,var(--color-muted)_60%,transparent)]"
              />
            ))}
          </ul>
        )}

        {filtered !== null && filtered.length === 0 && (
          <EmptyBookings hasAny={(items?.length ?? 0) > 0} filter={filter} />
        )}

        {filtered !== null && filtered.length > 0 && (
          <ul className="flex flex-col gap-4">
            {filtered.map((b) => (
              <BookingCard key={b.id} booking={b} />
            ))}
          </ul>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

function EmptyBookings({
  hasAny,
  filter,
}: {
  hasAny: boolean;
  filter: Filter;
}) {
  const headline = hasAny
    ? `Nothing in ${filter}.`
    : "No bookings yet.";
  const sub = hasAny
    ? "Try a different filter or browse new stays."
    : "Once you book a stay it will appear here. Browse the island and find a place that fits.";

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 px-4 py-20 text-center">
      <Inbox
        className="text-[var(--color-primary)]"
        size={60}
        strokeWidth={1.25}
        aria-hidden
      />
      <Eyebrow>Your trips</Eyebrow>
      <DisplayHeading level={3}>{headline}</DisplayHeading>
      <Lede>{sub}</Lede>
      <Link
        href="/listings"
        className={pillButtonClasses({ variant: "solid", size: "md" })}
      >
        Browse stays
      </Link>
    </div>
  );
}
