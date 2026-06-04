"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { deleteListing, getMyListings, publishListing, unpublishListing, type Listing } from "@/lib/listings";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { FlagDivider } from "@/components/decorations/flag-divider";
import { WaveDivider } from "@/components/decorations/wave-divider";

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

  if (loading || !user)
    return (
      <main className="flex min-h-screen items-center justify-center p-8 text-sm text-[var(--color-muted-foreground)]">
        Loading…
      </main>
    );

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-20">
        <div className="flex flex-wrap items-end justify-between gap-6 pb-6">
          <div>
            <p className="font-script text-2xl text-[var(--color-ochre)]">
              ou bann lakaz
            </p>
            <h1 className="mt-1 font-display text-5xl leading-[1.05] tracking-[-0.02em] sm:text-6xl">
              My listings.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-[var(--color-muted-foreground)]">
              Create, edit and publish your places. Add photos, set prices,
              control availability.
            </p>
          </div>
          <Link href="/host/listings/new">
            <Button variant="accent" size="lg" className="shadow-block">
              + Add listing
            </Button>
          </Link>
        </div>
        <FlagDivider />

        {error && (
          <p
            role="alert"
            className="mt-8 border-[1.5px] border-[var(--color-destructive)]/40 bg-[var(--color-destructive)]/5 px-4 py-3 text-sm text-[var(--color-destructive)]"
          >
            {error}
          </p>
        )}

        {listings.length === 0 ? (
          <div className="mt-20 flex max-w-xl flex-col items-start">
            <DodoSilhouetteSmall />
            <p className="mt-6 font-script text-3xl text-[var(--color-flamboyant)]">
              la pa enkor de listings
            </p>
            <p className="mt-2 font-display text-3xl tracking-[-0.02em]">
              No listings yet.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
              Use the button above to create your first place on DodoStays.
              It only takes a few minutes.
            </p>
            <Link href="/host/listings/new" className="mt-6">
              <Button variant="accent" size="lg" className="shadow-block">
                Create your first listing
              </Button>
            </Link>
          </div>
        ) : (
          <ul className="mt-2">
            {listings.map((l, idx) => (
              <li key={l.id}>
                <div className="grid grid-cols-1 gap-6 py-10 sm:grid-cols-[224px_1fr] sm:gap-10">
                  <div className="relative h-56 overflow-hidden border-[1.5px] border-[var(--color-ochre)] bg-[var(--color-muted)] sm:h-56">
                    {l.photos[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={l.photos[0].publicUrl}
                        alt=""
                        className="photo-warm h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-[var(--color-muted-foreground)]">
                        No photo yet
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-script text-xl text-[var(--color-ochre)]">
                          {l.region} · {l.propertyType}
                        </p>
                        <h2 className="mt-1 font-display text-2xl leading-[1.15] tracking-[-0.01em]">
                          {l.title || "Untitled listing"}
                        </h2>
                        <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                          MUR {l.nightlyRateMur.toLocaleString()} / night
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center border-[1.5px] px-2.5 font-script text-base ${
                          l.status === "Published"
                            ? "border-[var(--color-cane)] text-[var(--color-cane)]"
                            : "border-[var(--color-ochre)] text-[var(--color-ochre)]"
                        }`}
                      >
                        {l.status}
                      </span>
                    </div>
                    <div className="mt-auto flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs uppercase tracking-[0.14em]">
                      <Link
                        href={`/host/listings/${l.id}/edit`}
                        className="text-[var(--color-primary)] hover:text-[var(--color-accent)]"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        disabled={working}
                        onClick={() => togglePublish(l.id, l.status)}
                        className="text-[var(--color-primary)] hover:text-[var(--color-accent)] disabled:opacity-50"
                      >
                        {l.status === "Published" ? "Unpublish" : "Publish"}
                      </button>
                      <Link
                        href={`/listings/${l.id}`}
                        className="text-[var(--color-primary)] hover:text-[var(--color-accent)]"
                      >
                        View public
                      </Link>
                      <button
                        type="button"
                        disabled={working}
                        onClick={() => remove(l.id)}
                        className="text-[var(--color-flamboyant)] hover:text-[var(--color-destructive)] disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
                {idx < listings.length - 1 && <WaveDivider />}
              </li>
            ))}
          </ul>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

function DodoSilhouetteSmall() {
  return (
    <svg
      aria-hidden="true"
      width="48"
      height="40"
      viewBox="0 0 44 36"
      className="text-[var(--color-foreground)]"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8 22 C8 14, 14 9, 22 9 C28 9, 32 12, 33 16 C34 16.5, 36 17, 37.5 18 C39 19, 40 20.5, 39 21.5 C38 22.5, 35.5 22, 34 21.5 C33.5 24, 32 26, 30 27.5 L31.5 32 L28 32 L27 28.5 C25.5 29, 23.5 29, 22 28.7 L21 32.5 L17.5 32.5 L18.5 28 C13 26, 9.5 24, 8 22 Z"
        fill="currentColor"
      />
      <circle cx="33" cy="15.5" r="0.9" fill="var(--color-background)" />
      <path
        d="M8 21 C5.5 20.5, 4 21.5, 3 23 C4.5 23, 6 22.5, 8 22.5 Z"
        fill="currentColor"
      />
    </svg>
  );
}
