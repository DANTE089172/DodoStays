import { apiFetch } from "./api-client";
import type { Amenity, PropertyType } from "./listings";

export interface ParsedFilters {
  region: string | null;
  propertyType: PropertyType | null;
  minBedrooms: number | null;
  minGuests: number | null;
  maxNightlyMur: number | null;
  minNightlyMur: number | null;
  requiredAmenities: Amenity[];
  checkIn: string | null;
  checkOut: string | null;
  verifiedOnly: boolean;
  unknownTokens: string[];
}

export interface SearchParseResponse {
  filters: ParsedFilters;
  confidence: number;
  acknowledgement: string;
  boundingBoxHint: string | null;
}

export async function parseSearch(text: string, currentFilters?: ParsedFilters | null): Promise<SearchParseResponse> {
  return apiFetch<SearchParseResponse>("/api/search/parse", {
    method: "POST",
    body: JSON.stringify({ text, currentFilters: currentFilters ?? null }),
  });
}

export function filtersToSearchParams(f: ParsedFilters): URLSearchParams {
  const sp = new URLSearchParams();
  if (f.region) sp.set("region", f.region);
  if (f.propertyType) sp.set("propertyType", f.propertyType);
  if (f.minBedrooms !== null) sp.set("minBedrooms", String(f.minBedrooms));
  if (f.minGuests !== null) sp.set("minGuests", String(f.minGuests));
  if (f.maxNightlyMur !== null) sp.set("maxNightlyMur", String(f.maxNightlyMur));
  if (f.minNightlyMur !== null) sp.set("minNightlyMur", String(f.minNightlyMur));
  if (f.requiredAmenities.length > 0) sp.set("amenities", f.requiredAmenities.join(","));
  if (f.verifiedOnly) sp.set("verifiedOnly", "true");
  return sp;
}

export function searchParamsToFilters(sp: URLSearchParams): ParsedFilters {
  const am = sp.get("amenities");
  return {
    region: sp.get("region"),
    propertyType: (sp.get("propertyType") as PropertyType | null) ?? null,
    minBedrooms: sp.has("minBedrooms") ? Number(sp.get("minBedrooms")) : null,
    minGuests: sp.has("minGuests") ? Number(sp.get("minGuests")) : null,
    maxNightlyMur: sp.has("maxNightlyMur") ? Number(sp.get("maxNightlyMur")) : null,
    minNightlyMur: sp.has("minNightlyMur") ? Number(sp.get("minNightlyMur")) : null,
    requiredAmenities: am ? (am.split(",") as Amenity[]) : [],
    checkIn: null,
    checkOut: null,
    verifiedOnly: sp.get("verifiedOnly") === "true",
    unknownTokens: [],
  };
}
