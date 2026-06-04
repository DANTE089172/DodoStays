"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { deleteListing, getMyListings, publishListing, unpublishListing, type Listing } from "@/lib/listings";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

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
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-primary)]">
              Host dashboard
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">My listings</h1>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              Create, edit and publish your places.
            </p>
          </div>
          <Link href="/host/listings/new">
            <Button size="lg">+ Add listing</Button>
          </Link>
        </div>

        {error && (
          <p
            role="alert"
            className="mb-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        {listings.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
              <div
                aria-hidden="true"
                className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-muted)] text-2xl"
              >
                🏖️
              </div>
              <div>
                <p className="text-base font-semibold">No listings yet</p>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  Use the button above to create your first place on DodoStays.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-4">
            {listings.map((l) => (
              <li key={l.id}>
                <Card className="overflow-hidden transition-shadow hover:shadow-md">
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <div className="aspect-[4/3] w-full shrink-0 overflow-hidden bg-[var(--color-muted)] sm:aspect-auto sm:h-auto sm:w-56">
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
                    <div className="flex flex-1 flex-col gap-3 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="truncate text-lg font-semibold">{l.title}</h2>
                          <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
                            {l.region} · {l.propertyType} · MUR {l.nightlyRateMur.toLocaleString()}/night
                          </p>
                        </div>
                        <Badge variant={l.status === "Published" ? "success" : "muted"}>
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
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
