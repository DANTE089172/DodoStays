"use client";

import Link from "next/link";
import type { BookingState, BookingSummaryDto } from "@/lib/bookings";
import { formatDate, fromIsoDate } from "@/lib/dates";
import { Eyebrow } from "@/components/marketing/eyebrow";
import { DisplayHeading } from "@/components/marketing/display-heading";
import { pillButtonClasses } from "@/components/marketing/pill-button";
import { CinematicPhoto } from "@/components/cinematic";
import { cn } from "@/lib/utils";

interface Props {
  booking: BookingSummaryDto;
}

const STATE_LABEL: Record<BookingState, string> = {
  PendingPayment: "Pending payment",
  Confirmed: "Confirmed",
  CheckedIn: "Checked in",
  Completed: "Completed",
  Cancelled: "Cancelled",
  Disputed: "Disputed",
};

/**
 * Status chip uses a tracked-caps Plex pill keyed on a colour token.
 * Confirmed / CheckedIn -> peach (primary)
 * Completed -> cane (success)
 * PendingPayment -> ochre (warm)
 * Cancelled / Disputed -> destructive
 */
const STATE_TONE: Record<BookingState, string> = {
  PendingPayment:
    "border-[var(--color-ochre)] text-[var(--color-ochre)]",
  Confirmed:
    "border-[var(--color-primary)] text-[var(--color-primary)]",
  CheckedIn:
    "border-[var(--color-primary)] text-[var(--color-primary)]",
  Completed:
    "border-[var(--color-cane)] text-[var(--color-cane)]",
  Cancelled:
    "border-[var(--color-destructive)] text-[var(--color-destructive)]",
  Disputed:
    "border-[var(--color-destructive)] text-[var(--color-destructive)]",
};

export function BookingCard({ booking }: Props) {
  const checkIn = fromIsoDate(booking.dates.checkIn);
  const checkOut = fromIsoDate(booking.dates.checkOut);

  return (
    <li className="list-none">
      <article
        className={cn(
          "group flex flex-col gap-5 rounded-xl border bg-[var(--color-card)] p-4 sm:flex-row sm:items-stretch sm:gap-6 sm:p-5",
          "border-[color-mix(in_srgb,var(--color-foreground)_10%,transparent)]",
          "transition-[border-color] duration-200 ease-out",
          "hover:border-[var(--color-primary)]",
        )}
      >
        <div className="overflow-hidden rounded-lg bg-[var(--color-muted)] sm:w-[200px] sm:flex-shrink-0">
          <div className="relative aspect-[4/3]">
            {booking.primaryPhotoUrl && (
              <CinematicPhoto
                src={booking.primaryPhotoUrl}
                alt={booking.listingTitle}
                grade="warm"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.01]"
              />
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:gap-2.5">
          <Eyebrow tone="muted">Reservation</Eyebrow>
          <Link
            href={`/listings/${booking.listingId}`}
            className="text-[color:inherit] no-underline hover:underline"
          >
            <DisplayHeading level={4} className="!text-[1.5rem] !leading-tight">
              {booking.listingTitle}
            </DisplayHeading>
          </Link>
          <p className="font-[var(--font-sans)] text-sm text-[var(--color-muted-foreground)]">
            {formatDate(checkIn)} <span aria-hidden>&rarr;</span> {formatDate(checkOut)}
          </p>
          <div className="mt-1">
            <span
              className={cn(
                "ds-eyebrow inline-flex items-center rounded-full border-[1.5px] bg-transparent px-2.5 py-1",
                STATE_TONE[booking.state],
              )}
            >
              {STATE_LABEL[booking.state]}
            </span>
          </div>
        </div>

        <div className="flex flex-row items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-between sm:gap-3 sm:pl-2">
          <div className="text-right">
            <Eyebrow tone="muted">Total</Eyebrow>
            <p className="mt-1 font-[var(--font-display)] text-2xl font-semibold tracking-tight">
              MUR {booking.totalMur.toLocaleString()}
            </p>
          </div>
          <Link
            href={`/listings/${booking.listingId}`}
            className={pillButtonClasses({ variant: "ghost", size: "sm" })}
          >
            View details
          </Link>
        </div>
      </article>
    </li>
  );
}
