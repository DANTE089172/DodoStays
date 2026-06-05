"use client";

import type { ReactNode } from "react";

interface JournalPageProps {
  children: ReactNode;
  pageNumber: number;
  totalPages: number;
  kicker?: string;
  title: string;
  description?: string;
}

/**
 * The right-side content card of the wizard — warm-sand "page" with a
 * very subtle paper-fibre texture (single radial gradient at ~4% opacity).
 *
 * Per the minimalism direction: NO grain overlay, NO batik patterns —
 * texture is restrained on purpose.
 */
export function JournalPage({
  children,
  pageNumber,
  totalPages,
  kicker,
  title,
  description,
}: JournalPageProps) {
  return (
    <article
      className="relative overflow-hidden rounded-[10px] border border-[var(--color-border)] bg-[var(--color-sand)] p-8 sm:p-10"
      aria-labelledby="journal-page-title"
    >
      {/* Subtle paper-fibre texture — radial at very low opacity, single layer. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 22% 28%, var(--color-ink) 0px, transparent 1.2px)",
          backgroundSize: "10px 10px",
        }}
      />

      <header className="relative">
        {kicker ? (
          <p
            className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--color-primary)]"
          >
            {kicker}
          </p>
        ) : null}
        <h1
          id="journal-page-title"
          className="mt-1 font-[family-name:var(--font-fraunces)] text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-4xl"
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-3 max-w-prose font-[family-name:var(--font-plex)] text-[15px] leading-relaxed text-[var(--color-muted-foreground)]">
            {description}
          </p>
        ) : null}
      </header>

      <div className="relative mt-8">{children}</div>

      {/* Page X / Y in tiny Plex-mono at the bottom-right. */}
      <p
        className="absolute bottom-3 right-4 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]"
        aria-hidden
      >
        page {pageNumber} / {totalPages}
      </p>
    </article>
  );
}

export default JournalPage;
