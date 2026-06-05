import { apiFetch, buildApiUrl } from "./api-client";

export type BookingState = "PendingPayment" | "Confirmed" | "CheckedIn" | "Completed" | "Cancelled" | "Disputed";

export interface DateRange {
  checkIn: string;   // ISO YYYY-MM-DD
  checkOut: string;
}

export interface AvailabilityResponse {
  listingId: string;
  from: string;
  to: string;
  isAvailable: boolean;
  conflictingRanges: DateRange[];
}

export interface HoldBookingResponse {
  bookingId: string;
  state: BookingState;
  dates: DateRange;
  numGuests: number;
  nightlyRateMur: number;
  cleaningFeeMur: number;
  subtotalMur: number;
  vatMur: number;
  totalMur: number;
  holdExpiresAt: string;   // ISO timestamp
}

export interface BookingDto {
  id: string;
  listingId: string;
  listingTitle: string;
  primaryPhotoUrl: string | null;
  guestUserId: string;
  guestDisplayName: string;
  hostUserId: string;
  hostDisplayName: string;
  state: BookingState;
  dates: DateRange;
  numGuests: number;
  nightlyRateMur: number;
  cleaningFeeMur: number;
  subtotalMur: number;
  vatMur: number;
  totalMur: number;
  createdAt: string;
  confirmedAt: string | null;
  checkedInAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
}

export interface BookingSummaryDto {
  id: string;
  listingId: string;
  listingTitle: string;
  primaryPhotoUrl: string | null;
  state: BookingState;
  dates: DateRange;
  totalMur: number;
  createdAt: string;
}

export async function getAvailability(listingId: string, from: string, to: string): Promise<AvailabilityResponse> {
  const sp = new URLSearchParams({ from, to });
  return apiFetch<AvailabilityResponse>(`/api/listings/${listingId}/availability?${sp.toString()}`);
}

export async function holdBooking(
  accessToken: string,
  listingId: string,
  checkIn: string,
  checkOut: string,
  numGuests: number,
): Promise<HoldBookingResponse> {
  const res = await fetch(buildApiUrl("/api/bookings/hold"), {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ listingId, checkIn, checkOut, numGuests }),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<HoldBookingResponse>;
}

export async function confirmBooking(
  accessToken: string,
  bookingId: string,
  paymentReference?: string,
): Promise<BookingDto> {
  const res = await fetch(buildApiUrl("/api/bookings/confirm"), {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ bookingId, paymentReference: paymentReference ?? null }),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<BookingDto>;
}

export async function cancelBooking(
  accessToken: string,
  bookingId: string,
  reason?: string,
): Promise<BookingDto> {
  const res = await fetch(buildApiUrl(`/api/bookings/${bookingId}/cancel`), {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ reason: reason ?? null }),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<BookingDto>;
}

export async function getMyBookings(accessToken: string): Promise<BookingSummaryDto[]> {
  const res = await fetch(buildApiUrl("/api/bookings/mine"), {
    credentials: "include",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<BookingSummaryDto[]>;
}
