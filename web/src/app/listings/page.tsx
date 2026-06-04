import { searchListings, type ListingSearchResponse } from "@/lib/listings";
import { searchParamsToFilters } from "@/lib/search";
import { AiSearchBar } from "@/components/search/ai-search-bar";
import { FilterChips } from "@/components/search/filter-chips";
import { ExampleQueries } from "@/components/search/example-queries";
import { SearchAcknowledgement } from "@/components/search/search-acknowledgement";
import { ListingsExplorer } from "./listings-explorer";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

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

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 py-6">
        <header className="mb-4 text-center">
          <h1 className="font-display text-4xl">Browse Mauritius</h1>
          <p className="font-script text-xl text-[var(--ds-ochre,_#D4A24C)]">kot ou trouve nou.</p>
        </header>

        <AiSearchBar
          initialText={initialText}
          initialFilters={filters}
          preserveParams={["anchors", "bbox", "liveSearch"]}
        />
        <SearchAcknowledgement text={ack} />
        {!initialText && <ExampleQueries />}

        <FilterChips filters={filters} preserveParams={["anchors", "bbox", "liveSearch"]} />

        <p className="my-3 text-sm text-[var(--color-muted-foreground)]">{results.totalCount} listings</p>
        {error && (
          <p role="alert" className="mb-4 text-sm text-[var(--color-destructive)]">
            {error}
          </p>
        )}

        <ListingsExplorer items={results.items} />
      </main>
      <SiteFooter />
    </>
  );
}
