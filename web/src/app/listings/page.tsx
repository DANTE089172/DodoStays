import Link from "next/link";
import { searchListings, type ListingSearchResponse } from "@/lib/listings";
import { SearchForm } from "./search-form";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function ListingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const params: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") params[k] = v;
  }

  let results: ListingSearchResponse;
  let error: string | null = null;
  try {
    results = await searchListings(params);
  } catch (e) {
    results = { items: [], page: 1, pageSize: 20, totalCount: 0, totalPages: 1 };
    error = (e as Error).message;
  }

  const hasFilters = Object.values(params).some((v) => v && v.length > 0);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-primary)]">
            Browse stays
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            Stays in Mauritius
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            {results.totalCount} {results.totalCount === 1 ? "listing" : "listings"}
            {hasFilters ? " match your filters" : " available"}
          </p>
        </div>

        <SearchForm />

        {error && (
          <p
            role="alert"
            className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        {results.items.length === 0 && !error ? (
          <Card className="mt-10 border-dashed">
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <span aria-hidden="true" className="text-3xl">🌴</span>
              <p className="text-base font-semibold">No listings match these filters yet</p>
              <p className="max-w-md text-sm text-[var(--color-muted-foreground)]">
                Try widening the region, adjusting price, or removing the property type.
              </p>
              <Link
                href="/listings"
                className="text-sm font-medium text-[var(--color-primary)] hover:underline"
              >
                Clear filters
              </Link>
            </div>
          </Card>
        ) : (
          <ul className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {results.items.map((l) => (
              <li key={l.id}>
                <Link href={`/listings/${l.id}`} className="group block h-full">
                  <Card className="flex h-full flex-col overflow-hidden border-[var(--color-border)] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
                    <div className="relative aspect-[4/3] overflow-hidden bg-[var(--color-muted)]">
                      {l.primaryPhotoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={l.primaryPhotoUrl}
                          alt={l.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-[var(--color-muted-foreground)]">
                          No photo
                        </div>
                      )}
                      {l.tier === "Verified" && (
                        <Badge variant="default" className="absolute left-3 top-3 shadow-sm">
                          ✓ Verified
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="line-clamp-2 text-base font-semibold leading-snug">
                          {l.title}
                        </h2>
                      </div>
                      <p className="text-sm text-[var(--color-muted-foreground)]">
                        {formatRegion(l.region)} · {l.propertyType} · {l.maxGuests} guests
                      </p>
                      <div className="mt-auto pt-2">
                        <p className="text-base">
                          <span className="font-semibold">
                            MUR {l.nightlyRateMur.toLocaleString()}
                          </span>
                          <span className="text-xs text-[var(--color-muted-foreground)]"> / night</span>
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

function formatRegion(slug: string): string {
  return slug
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}
