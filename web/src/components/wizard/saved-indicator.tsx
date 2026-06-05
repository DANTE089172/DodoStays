"use client";

import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/auto-save";

interface SavedIndicatorProps {
  isSaving: boolean;
  lastSavedAt: Date | null;
}

/**
 * Small inline status chip used inside the journal footer.
 * Renders nothing when there's nothing to say.
 */
export function SavedIndicator({ isSaving, lastSavedAt }: SavedIndicatorProps) {
  // Re-render every second while we have a `lastSavedAt` so the relative
  // "saved 12s ago" label stays current.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (isSaving || !lastSavedAt) return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [isSaving, lastSavedAt]);

  if (!isSaving && !lastSavedAt) return null;

  if (isSaving) {
    return (
      <span
        className="inline-flex items-center gap-2 font-[family-name:var(--font-plex)] text-[13px] italic text-[var(--color-muted-foreground)]"
        aria-live="polite"
      >
        <span
          className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-primary)]"
          aria-hidden
        />
        Saving…
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-2 font-[family-name:var(--font-plex)] text-[13px] italic text-[var(--color-muted-foreground)]"
      aria-live="polite"
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-ink)]"
        aria-hidden
      />
      Saved {timeAgo(lastSavedAt!)}
    </span>
  );
}

export default SavedIndicator;
