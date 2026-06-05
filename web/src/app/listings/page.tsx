import { searchListings, type ListingSearchResponse } from "@/lib/listings";
import { searchParamsToFilters } from "@/lib/search";
import { AiSearchBar } from "@/components/search/ai-search-bar";
import { FilterChips } from "@/components/search/filter-chips";
import { ExampleQueries } from "@/components/search/example-queries";
import { SearchAcknowledgement } from "@/components/search/search-acknowledgement";
import { ListingsExplorer } from "./listings-explorer";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Eyebrow } from "@/components/marketing/eyebrow";
import { DisplayHeading } from "@/components/marketing/display-heading";

export const dynamic = "force-dynamic";

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
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

  const filters = searchParamsToFilters(new URLSearchParams(params as Record<string, string>));
  const initialText = params.q ?? "";
  const ack = filters.region || filters.propertyType || filters.minBedrooms !== null
    ? `Searching: ${[
        filters.propertyType ? `${filters.propertyType.toLowerCase()}s` : null,
        filters.minBedrooms !== null ? `${filters.minBedrooms}+ bed` : null,
        filters.region ? `in ${filters.region.replace(/-/g, " ")}` : null,
        filters.maxNightlyMur !== null ? `under MUR ${filters.maxNightlyMur.toLocaleString()}/night` : null,
        filters.requiredAmenities.length > 0 ? `with ${filters.requiredAmenities.join(", ").toLowerCase()}` : null,
        filters.verifiedOnly ? "(verified only)" : null,
      ].filter(Boolean).join(", ")}`
    : null;

  const headingText = initialText.trim().length > 0 ? initialText.trim() : "Curated stays";

  return (
    <>
      <SiteHeader />
      <main className="bg-[var(--color-sand)]">
        <div className="mx-auto max-w-7xl px-6 py-10 sm:px-10 sm:py-14">
          <header className="mb-8 max-w-3xl">
            <Eyebrow tone="peach">Stays in Mauritius</Eyebrow>
            <DisplayHeading level={2} className="mt-3">
              {headingText}
            </DisplayHeading>
          </header>

          <AiSearchBar
            initialText={initialText}
            initialFilters={filters}
            preserveParams={["anchors", "bbox", "liveSearch"]}
          />
          <SearchAcknowledgement text={ack} />
          {!initialText && <ExampleQueries />}

          <FilterChips filters={filters} preserveParams={["anchors", "bbox", "liveSearch"]} />

          <p className="my-4 ds-eyebrow text-[var(--color-muted-foreground)]">
            {results.totalCount} {results.totalCount === 1 ? "stay" : "stays"}
          </p>
          {error && (
            <p role="alert" className="mb-4 text-sm text-[var(--color-destructive)]">
              {error}
            </p>
          )}

          <ListingsExplorer items={results.items} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
