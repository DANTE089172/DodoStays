import { apiFetch, buildApiUrl } from "./api-client";

export type PropertyType = "Villa" | "Apartment" | "Guesthouse";
export type ListingTier = "Standard" | "Verified";
export type ListingStatus = "Draft" | "Published" | "Suspended" | "Archived";
export type Amenity =
  | "Pool" | "BeachAccess" | "AirCon" | "Wifi" | "Kitchen" | "Parking"
  | "Tv" | "WashingMachine" | "Balcony" | "Garden" | "Bbq" | "Generator";

export interface ListingPhoto {
  id: string;
  publicUrl: string;
  caption: string | null;
  sortOrder: number;
}

export interface Listing {
  id: string;
  hostUserId: string;
  hostDisplayName: string;
  title: string;
  description: string;
  propertyType: PropertyType;
  tier: ListingTier;
  status: ListingStatus;
  region: string;
  addressLine: string;
  latitude: number;
  longitude: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  maxGuests: number;
  nightlyRateMur: number;
  cleaningFeeMur: number;
  minStayNights: number;
  amenities: Amenity[];
  photos: ListingPhoto[];
  createdAt: string;
  publishedAt: string | null;
}

export interface ListingSummary {
  id: string;
  title: string;
  propertyType: PropertyType;
  tier: ListingTier;
  region: string;
  bedrooms: number;
  beds: number;
  maxGuests: number;
  nightlyRateMur: number;
  primaryPhotoUrl: string | null;
  createdAt: string;
}

export interface ListingSearchResponse {
  items: ListingSummary[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface CreateOrUpdateListingInput {
  title: string;
  description: string;
  propertyType: PropertyType;
  region: string;
  addressLine: string;
  latitude: number;
  longitude: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  maxGuests: number;
  nightlyRateMur: number;
  cleaningFeeMur: number;
  minStayNights: number;
  amenities: Amenity[];
}

export async function searchListings(params: URLSearchParams | Record<string, string | undefined>): Promise<ListingSearchResponse> {
  const search = params instanceof URLSearchParams ? params : toSearchParams(params);
  return apiFetch<ListingSearchResponse>(`/api/listings?${search.toString()}`);
}

export async function getListing(id: string): Promise<Listing> {
  return apiFetch<Listing>(`/api/listings/${id}`);
}

export async function getMyListings(accessToken: string): Promise<Listing[]> {
  const res = await fetch(buildApiUrl("/api/listings/mine"), {
    credentials: "include",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<Listing[]>;
}

export async function createListing(accessToken: string, input: CreateOrUpdateListingInput): Promise<Listing> {
  const res = await fetch(buildApiUrl("/api/listings"), {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<Listing>;
}

export async function updateListing(accessToken: string, id: string, input: CreateOrUpdateListingInput): Promise<Listing> {
  const res = await fetch(buildApiUrl(`/api/listings/${id}`), {
    method: "PUT",
    credentials: "include",
    headers: { "content-type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<Listing>;
}

export async function deleteListing(accessToken: string, id: string): Promise<void> {
  const res = await fetch(buildApiUrl(`/api/listings/${id}`), {
    method: "DELETE",
    credentials: "include",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
}

export async function publishListing(accessToken: string, id: string): Promise<Listing> {
  const res = await fetch(buildApiUrl(`/api/listings/${id}/publish`), {
    method: "POST",
    credentials: "include",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<Listing>;
}

export async function unpublishListing(accessToken: string, id: string): Promise<Listing> {
  const res = await fetch(buildApiUrl(`/api/listings/${id}/unpublish`), {
    method: "POST",
    credentials: "include",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<Listing>;
}

export async function uploadPhoto(accessToken: string, listingId: string, file: File, caption?: string): Promise<ListingPhoto> {
  const formData = new FormData();
  formData.append("file", file);
  if (caption) formData.append("caption", caption);
  const res = await fetch(buildApiUrl(`/api/listings/${listingId}/photos`), {
    method: "POST",
    credentials: "include",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<ListingPhoto>;
}

export async function deletePhoto(accessToken: string, listingId: string, photoId: string): Promise<void> {
  const res = await fetch(buildApiUrl(`/api/listings/${listingId}/photos/${photoId}`), {
    method: "DELETE",
    credentials: "include",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
}

export const REGIONS = [
  { slug: "grand-baie", label: "Grand Baie" },
  { slug: "flic-en-flac", label: "Flic en Flac" },
  { slug: "tamarin", label: "Tamarin" },
  { slug: "trou-aux-biches", label: "Trou aux Biches" },
  { slug: "pereybere", label: "Pereybere" },
  { slug: "belle-mare", label: "Belle Mare" },
  { slug: "le-morne", label: "Le Morne" },
  { slug: "blue-bay", label: "Blue Bay" },
  { slug: "albion", label: "Albion" },
];

export const AMENITY_OPTIONS: { value: Amenity; label: string }[] = [
  { value: "Pool", label: "Pool" },
  { value: "BeachAccess", label: "Beach access" },
  { value: "AirCon", label: "Air conditioning" },
  { value: "Wifi", label: "Wi-Fi" },
  { value: "Kitchen", label: "Kitchen" },
  { value: "Parking", label: "Parking" },
  { value: "Tv", label: "TV" },
  { value: "WashingMachine", label: "Washing machine" },
  { value: "Balcony", label: "Balcony" },
  { value: "Garden", label: "Garden" },
  { value: "Bbq", label: "BBQ" },
  { value: "Generator", label: "Generator" },
];

function toSearchParams(input: Record<string, string | undefined>): URLSearchParams {
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined && v !== "") out.set(k, v);
  }
  return out;
}
