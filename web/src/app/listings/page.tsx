import Link from "next/link";
import { searchListings, type ListingSearchResponse } from "@/lib/listings";
import { SearchForm } from "./search-form";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
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
  const featured = results.items[0];
  const rest = results.items.slice(1);

  return (
    <>
      <SiteHeader />
      <main className="pb-20">
        {/* Hero strip */}
        <section className="border-b border-[var(--color-border)]">
          <div className="mx-auto max-w-7xl px-6 pt-14 pb-10 sm:px-10 sm:pt-20">
            <div className="grid gap-8 md:grid-cols-[2fr_1fr] md:items-end">
              <div>
                <p className="small-caps text-xs text-[var(--color-muted-foreground)]">
                  Browse stays
                </p>
                <h1 className="mt-4 font-display text-5xl leading-[1.05] tracking-[-0.02em] sm:text-6xl">
                  Stays in <span className="italic">Mauritius</span>.
                </h1>
              </div>
              <p className="text-sm text-[var(--color-muted-foreground)] md:text-right">
                {results.totalCount} {results.totalCount === 1 ? "place" : "places"}
                {hasFilters ? " match your filters" : " currently available"}
              </p>
            </div>
            <div className="mt-10">
              <SearchForm />
            </div>
          </div>
        </section>

        {error && (
          <div className="mx-auto mt-8 max-w-7xl px-6 sm:px-10">
            <p
              role="alert"
              className="border border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/5 px-4 py-3 text-sm text-[var(--color-destructive)]"
            >
              {error}
            </p>
          </div>
        )}

        {results.items.length === 0 && !error ? (
          <div className="mx-auto mt-20 max-w-2xl px-6 text-center sm:px-10">
            <p className="font-display text-3xl tracking-[-0.02em]">
              No stays match these filters yet.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
              Try widening the region, adjusting price, or removing the
              property type.
            </p>
            <Link
              href="/listings"
              className="mt-6 inline-block text-sm text-[var(--color-foreground)] underline underline-offset-4 hover:text-[var(--color-accent)]"
            >
              Clear filters
            </Link>
          </div>
        ) : (
          <>
            {/* Featured stay — full-bleed banner */}
            {featured && (
              <section className="mx-auto mt-14 max-w-7xl px-6 sm:px-10">
                <Link
                  href={`/listings/${featured.id}`}
                  className="group block"
                >
                  <div className="relative aspect-[2/1] w-full overflow-hidden bg-[var(--color-muted)]">
                    {featured.primaryPhotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={featured.primaryPhotoUrl}
                        alt={featured.title}
                        className="h-full w-full object-cover transition-opacity duration-200 ease-out group-hover:opacity-95"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-[var(--color-muted-foreground)]">
                        No photo
                      </div>
                    )}
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 editorial-gradient"
                    />
                    <div className="absolute bottom-0 left-0 right-0 flex flex-col gap-2 p-8 sm:p-12">
                      {featured.tier === "Verified" && (
                        <Badge variant="accent" className="self-start">
                          Verified host
                        </Badge>
                      )}
                      <p className="small-caps text-xs text-[var(--color-sand)]/80">
                        {formatRegion(featured.region)} · {featured.propertyType}
                      </p>
                      <h2 className="max-w-3xl font-display text-3xl leading-[1.1] tracking-[-0.02em] text-[var(--color-sand)] sm:text-5xl">
                        {featured.title}
                      </h2>
                      <p className="text-sm text-[var(--color-sand)]/85">
                        From{" "}
                        <span className="font-medium">
                          MUR {featured.nightlyRateMur.toLocaleString()}
                        </span>{" "}
                        per night · sleeps {featured.maxGuests}
                      </p>
                    </div>
                  </div>
                </Link>
              </section>
            )}

            {/* Rest — photo-first editorial cards, no card chrome */}
            {rest.length > 0 && (
              <section className="mx-auto mt-20 max-w-7xl px-6 sm:px-10">
                <p className="small-caps mb-8 text-xs text-[var(--color-muted-foreground)]">
                  More stays
                </p>
                <ul className="grid grid-cols-1 gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
                  {rest.map((l) => (
                    <li key={l.id}>
                      <Link
                        href={`/listings/${l.id}`}
                        className="group block"
                      >
                        <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--color-muted)]">
                          {l.primaryPhotoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={l.primaryPhotoUrl}
                              alt={l.title}
                              className="h-full w-full object-cover transition-opacity duration-200 ease-out group-hover:opacity-95"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-[var(--color-muted-foreground)]">
                              No photo
                            </div>
                          )}
                          {l.tier === "Verified" && (
                            <Badge
                              variant="accent"
                              className="absolute left-4 top-4"
                            >
                              Verified
                            </Badge>
                          )}
                        </div>
                        <div className="mt-5 flex flex-col gap-1.5">
                          <p className="small-caps text-xs text-[var(--color-muted-foreground)]">
                            {formatRegion(l.region)} · {l.propertyType}
                          </p>
                          <h2 className="font-display text-xl leading-[1.2] tracking-[-0.01em] text-[var(--color-foreground)] transition-colors duration-200 ease-out group-hover:text-[var(--color-accent)] group-hover:underline group-hover:underline-offset-4">
                            {l.title}
                          </h2>
                          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                            <span className="text-[var(--color-foreground)]">
                              MUR {l.nightlyRateMur.toLocaleString()}
                            </span>{" "}
                            / night · sleeps {l.maxGuests}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
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
