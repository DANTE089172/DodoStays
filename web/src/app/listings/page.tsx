import Link from "next/link";
import { searchListings, type ListingSearchResponse } from "@/lib/listings";
import { SearchForm } from "./search-form";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";
import { FlagDivider } from "@/components/decorations/flag-divider";

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
        {/* Top strip — volcanic bg with sand text */}
        <section className="bg-[var(--color-foreground)] text-[var(--color-sand)]">
          <div className="mx-auto max-w-7xl px-6 pt-16 pb-12 sm:px-10 sm:pt-24">
            <div className="grid gap-8 md:grid-cols-[2fr_1fr] md:items-end">
              <div>
                <p className="font-script text-2xl text-[var(--color-ochre)]">
                  kot ou trouve nou
                </p>
                <h1 className="mt-1 font-display text-5xl leading-[1.05] tracking-[-0.02em] text-[var(--color-sand)] sm:text-6xl">
                  Browse Mauritius.
                </h1>
              </div>
              <p className="text-sm text-[var(--color-sand)]/75 md:text-right">
                {results.totalCount} {results.totalCount === 1 ? "place" : "places"}
                {hasFilters ? " match your filters" : " currently available"}
              </p>
            </div>
          </div>
          <FlagDivider />
        </section>

        {/* Sticky toolbar */}
        <section className="sticky top-16 z-20 border-t-[1.5px] border-b-[1.5px] border-[var(--color-ochre)] bg-[var(--color-sand)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-sand)]/85">
          <div className="mx-auto max-w-7xl px-6 py-5 sm:px-10">
            <SearchForm />
          </div>
        </section>

        {error && (
          <div className="mx-auto mt-8 max-w-7xl px-6 sm:px-10">
            <p
              role="alert"
              className="border-[1.5px] border-[var(--color-destructive)]/40 bg-[var(--color-destructive)]/5 px-4 py-3 text-sm text-[var(--color-destructive)]"
            >
              {error}
            </p>
          </div>
        )}

        {results.items.length === 0 && !error ? (
          <div className="mx-auto mt-24 max-w-2xl px-6 text-center sm:px-10">
            <DodoSilhouetteSmall />
            <p className="mt-6 font-script text-3xl text-[var(--color-flamboyant)]">
              pa enkor de listings...
            </p>
            <p className="mt-3 font-display text-2xl tracking-[-0.02em]">
              No stays match these filters yet.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
              Try widening the region, adjusting price, or removing the
              property type.
            </p>
            <Link
              href="/listings"
              className="mt-6 inline-block text-sm text-[var(--color-primary)] underline underline-offset-4 hover:text-[var(--color-accent)]"
            >
              Clear filters
            </Link>
          </div>
        ) : (
          <>
            {/* Featured banner */}
            {featured && (
              <section className="mx-auto mt-14 max-w-7xl px-6 sm:px-10">
                <Link
                  href={`/listings/${featured.id}`}
                  className="group block"
                >
                  <div className="relative aspect-[2/1] w-full overflow-hidden border-[1.5px] border-[var(--color-ochre)] bg-[var(--color-muted)] shadow-block">
                    {featured.primaryPhotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={featured.primaryPhotoUrl}
                        alt={featured.title}
                        className="photo-warm h-full w-full object-cover transition-opacity duration-200 ease-out group-hover:opacity-95"
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
                        <span className="self-start border-[1.5px] border-[var(--color-cane)] bg-[var(--color-sand)] px-2.5 font-script text-base text-[var(--color-cane)]">
                          verified
                        </span>
                      )}
                      <p className="font-script text-xl text-[var(--color-ochre)]">
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

            {/* Rest grid */}
            {rest.length > 0 && (
              <section className="mx-auto mt-20 max-w-7xl px-6 sm:px-10">
                <p className="font-script mb-8 text-2xl text-[var(--color-ochre)]">
                  more stays
                </p>
                <ul className="grid grid-cols-1 gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
                  {rest.map((l) => (
                    <li key={l.id}>
                      <Link
                        href={`/listings/${l.id}`}
                        className="group block"
                      >
                        <div className="relative aspect-[4/3] w-full overflow-hidden border-[1.5px] border-[var(--color-ochre)] bg-[var(--color-muted)]">
                          {l.primaryPhotoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={l.primaryPhotoUrl}
                              alt={l.title}
                              className="photo-warm h-full w-full object-cover transition-opacity duration-200 ease-out group-hover:opacity-95"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-[var(--color-muted-foreground)]">
                              No photo
                            </div>
                          )}
                          {l.tier === "Verified" && (
                            <Badge
                              variant="accent"
                              className="absolute left-3 top-3"
                            >
                              Verified
                            </Badge>
                          )}
                        </div>
                        <div className="mt-5 flex flex-col gap-1">
                          <p className="font-script text-lg text-[var(--color-ochre)]">
                            {formatRegion(l.region)} · {l.propertyType}
                          </p>
                          <h2 className="font-display text-xl leading-[1.2] tracking-[-0.01em] text-[var(--color-foreground)] transition-colors duration-200 ease-out group-hover:text-[var(--color-accent)]">
                            {l.title}
                          </h2>
                          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                            <span className="font-bold text-[var(--color-foreground)]">
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

function DodoSilhouetteSmall() {
  return (
    <svg
      aria-hidden="true"
      width="48"
      height="40"
      viewBox="0 0 44 36"
      className="mx-auto text-[var(--color-foreground)]"
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
