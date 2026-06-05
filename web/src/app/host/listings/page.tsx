"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Home } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  deleteListing,
  getMyListings,
  publishListing,
  unpublishListing,
  type Listing,
} from "@/lib/listings";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Section } from "@/components/marketing/section";
import { Eyebrow } from "@/components/marketing/eyebrow";
import { DisplayHeading } from "@/components/marketing/display-heading";
import { Lede } from "@/components/marketing/lede";
import { pillButtonClasses } from "@/components/marketing/pill-button";
import { cn } from "@/lib/utils";

export default function HostListingsPage() {
  const router = useRouter();
  const { user, accessToken, loading } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/signin");
  }, [loading, user, router]);

  useEffect(() => {
    if (!accessToken) return;
    getMyListings(accessToken).then(setListings).catch((e) => setError((e as Error).message));
  }, [accessToken]);

  const stats = useMemo(() => {
    const total = listings.length;
    const published = listings.filter((l) => l.status === "Published").length;
    const drafts = total - published;
    const totalRate = listings.reduce((sum, l) => sum + (l.nightlyRateMur ?? 0), 0);
    const avgRate = total > 0 ? Math.round(totalRate / total) : 0;
    return { total, published, drafts, avgRate };
  }, [listings]);

  async function togglePublish(id: string, status: string) {
    if (!accessToken) return;
    setWorking(true);
    try {
      const updated = status === "Published"
        ? await unpublishListing(accessToken, id)
        : await publishListing(accessToken, id);
      setListings((curr) => curr.map((l) => l.id === id ? updated : l));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorking(false);
    }
  }

  async function remove(id: string) {
    if (!accessToken || !confirm("Delete this listing? This cannot be undone.")) return;
    setWorking(true);
    try {
      await deleteListing(accessToken, id);
      setListings((curr) => curr.filter((l) => l.id !== id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorking(false);
    }
  }

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8 text-sm text-[var(--color-muted-foreground)]">
        Loading…
      </main>
    );
  }

  const greetingName = user.displayName || "Host";

  return (
    <>
      <SiteHeader />

      <Section tone="cream" size="sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <Eyebrow>Host dashboard</Eyebrow>
            <DisplayHeading level={2} className="mt-3">
              {greetingName}
            </DisplayHeading>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--color-muted-foreground)]">
              Create, edit and publish your places. Add photos, set prices,
              control availability.
            </p>
          </div>
          <Link
            href="/host/listings/new"
            className={pillButtonClasses({ variant: "solid", size: "md" })}
          >
            + Add listing
          </Link>
        </div>

        {/* KPI strip */}
        <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard label="Active listings" value={stats.published.toString()} hint={stats.drafts > 0 ? `${stats.drafts} draft${stats.drafts === 1 ? "" : "s"}` : "All published"} />
          <KpiCard label="Total listings" value={stats.total.toString()} hint="Including drafts" />
          <KpiCard label="Avg nightly rate" value={stats.avgRate > 0 ? `MUR ${stats.avgRate.toLocaleString()}` : "—"} hint="Across your places" />
          <KpiCard label="Status" value={stats.published > 0 ? "Live" : "Setup"} hint={stats.published > 0 ? "Bookings open" : "Publish to go live"} />
        </div>
      </Section>

      <main className="mx-auto w-full max-w-7xl px-6 py-10 sm:px-10 sm:py-14">
        {/* Tabs (single tab for now — Listings) */}
        <div
          role="tablist"
          aria-label="Host sections"
          className="flex flex-wrap items-center gap-x-1 border-b border-[color-mix(in_srgb,var(--color-foreground)_12%,transparent)]"
        >
          <span
            role="tab"
            aria-selected="true"
            className="ds-eyebrow relative -mb-px px-4 py-3 text-[var(--color-foreground)]"
          >
            Listings
            <span
              aria-hidden
              className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-[var(--color-primary)]"
            />
          </span>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-6 rounded-md border border-[color-mix(in_srgb,var(--color-destructive)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-destructive)_5%,transparent)] px-4 py-3 text-sm text-[var(--color-destructive)]"
          >
            {error}
          </p>
        )}

        {listings.length === 0 ? (
          <EmptyListings />
        ) : (
          <ul className="mt-2">
            {listings.map((l) => (
              <li
                key={l.id}
                className="grid grid-cols-1 items-center gap-5 border-b border-[color-mix(in_srgb,var(--color-foreground)_10%,transparent)] py-6 sm:grid-cols-[200px_1fr_auto] sm:gap-6"
              >
                <div className="overflow-hidden rounded-lg bg-[var(--color-muted)]">
                  <div className="relative aspect-[4/3]">
                    {l.photos[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={l.photos[0].publicUrl}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-xs text-[var(--color-muted-foreground)]">
                        No photo yet
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex min-w-0 flex-col gap-2">
                  <Eyebrow tone="muted">
                    {l.region} &middot; {l.propertyType}
                  </Eyebrow>
                  <Link
                    href={`/host/listings/${l.id}/edit`}
                    className="text-[color:inherit] no-underline hover:underline"
                  >
                    <DisplayHeading level={4} className="!text-[1.5rem] !leading-tight">
                      {l.title || "Untitled listing"}
                    </DisplayHeading>
                  </Link>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    MUR {l.nightlyRateMur.toLocaleString()} / night
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    <StatusChip status={l.status} />
                    <button
                      type="button"
                      disabled={working}
                      onClick={() => togglePublish(l.id, l.status)}
                      className="ds-eyebrow text-[var(--color-primary)] transition-colors duration-150 hover:text-[var(--color-primary-hover)] disabled:opacity-50"
                    >
                      {l.status === "Published" ? "Unpublish" : "Publish"}
                    </button>
                    <Link
                      href={`/listings/${l.id}`}
                      className="ds-eyebrow text-[var(--color-muted-foreground)] transition-colors duration-150 hover:text-[var(--color-foreground)]"
                    >
                      View public
                    </Link>
                    <button
                      type="button"
                      disabled={working}
                      onClick={() => remove(l.id)}
                      className="ds-eyebrow text-[var(--color-destructive)] transition-colors duration-150 hover:text-[var(--color-accent)] disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="flex justify-start sm:justify-end">
                  <Link
                    href={`/host/listings/${l.id}/edit`}
                    className={pillButtonClasses({ variant: "ghost", size: "sm" })}
                  >
                    Edit
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-[color-mix(in_srgb,var(--color-foreground)_10%,transparent)] bg-[var(--color-card)] px-4 py-4">
      <Eyebrow tone="muted">{label}</Eyebrow>
      <p className="mt-2 font-[var(--font-display)] text-[1.75rem] leading-none font-semibold tracking-tight">
        {value}
      </p>
      {hint && (
        <p className="mt-1.5 text-xs text-[var(--color-muted-foreground)]">{hint}</p>
      )}
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const tone =
    status === "Published"
      ? "border-[var(--color-cane)] text-[var(--color-cane)]"
      : "border-[var(--color-ochre)] text-[var(--color-ochre)]";
  return (
    <span
      className={cn(
        "ds-eyebrow inline-flex items-center rounded-full border-[1.5px] px-2.5 py-1",
        tone,
      )}
    >
      {status}
    </span>
  );
}

function EmptyListings() {
  return (
    <div className="mx-auto mt-10 flex max-w-2xl flex-col items-center gap-5 px-4 py-20 text-center">
      <Home
        className="text-[var(--color-primary)]"
        size={60}
        strokeWidth={1.25}
        aria-hidden
      />
      <Eyebrow>Get started</Eyebrow>
      <DisplayHeading level={3}>No listings yet.</DisplayHeading>
      <Lede>
        Use the button below to create your first place on DodoStays. It only
        takes a few minutes.
      </Lede>
      <Link
        href="/host/listings/new"
        className={pillButtonClasses({ variant: "solid", size: "md" })}
      >
        Create your first listing
      </Link>
    </div>
  );
}
