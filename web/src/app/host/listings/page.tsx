"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { deleteListing, getMyListings, publishListing, unpublishListing, type Listing } from "@/lib/listings";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
        <div className="flex flex-wrap items-end justify-between gap-6 border-b border-[var(--color-border)] pb-10">
          <div>
            <p className="small-caps text-xs text-[var(--color-muted-foreground)]">
              Host dashboard
            </p>
            <h1 className="mt-4 font-display text-5xl leading-[1.05] tracking-[-0.02em] sm:text-6xl">
              My listings.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-[var(--color-muted-foreground)]">
              Create, edit and publish your places. Add photos, set prices,
              control availability.
            </p>
          </div>
          <Link href="/host/listings/new">
            <Button variant="accent" size="lg">+ Add listing</Button>
          </Link>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-8 border border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/5 px-4 py-3 text-sm text-[var(--color-destructive)]"
          >
            {error}
          </p>
        )}

        {listings.length === 0 ? (
          <div className="mt-20 max-w-xl">
            <p className="font-display text-3xl tracking-[-0.02em]">
              No listings yet.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
              Use the button above to create your first place on DodoStays.
              It only takes a few minutes.
            </p>
          </div>
        ) : (
          <ul className="mt-2">
            {listings.map((l) => (
              <li
                key={l.id}
                className="grid grid-cols-1 gap-6 border-b border-[var(--color-border)] py-10 sm:grid-cols-[260px_1fr] sm:gap-10"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-[var(--color-muted)] sm:aspect-[16/10]">
                  {l.photos[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={l.photos[0].publicUrl}
                      alt=""
                      className="h-full w-full object-cover"
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
                      <p className="small-caps text-xs text-[var(--color-muted-foreground)]">
                        {l.region} · {l.propertyType}
                      </p>
                      <h2 className="mt-2 font-display text-2xl leading-[1.15] tracking-[-0.01em]">
                        {l.title || "Untitled listing"}
                      </h2>
                      <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                        MUR {l.nightlyRateMur.toLocaleString()} / night
                      </p>
                    </div>
                    <Badge
                      variant={l.status === "Published" ? "accent" : "muted"}
                    >
                      {l.status}
                    </Badge>
                  </div>
                  <div className="mt-auto flex flex-wrap gap-2 pt-2">
                    <Link href={`/host/listings/${l.id}/edit`}>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={working}
                      onClick={() => togglePublish(l.id, l.status)}
                    >
                      {l.status === "Published" ? "Unpublish" : "Publish"}
                    </Button>
                    <Link href={`/listings/${l.id}`}>
                      <Button variant="ghost" size="sm">
                        View public
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={working}
                      onClick={() => remove(l.id)}
                      className="text-[var(--color-destructive)] hover:bg-[var(--color-destructive)]/10 hover:text-[var(--color-destructive)]"
                    >
                      Delete
                    </Button>
                  </div>
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
