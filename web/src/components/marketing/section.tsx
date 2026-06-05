import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "sand" | "cream" | "ink" | "cinema";
type Size = "sm" | "md" | "lg";

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  tone?: Tone;
  size?: Size;
  /** Optionally widen the inner container. Default keeps the editorial column. */
  width?: "narrow" | "wide";
  children: React.ReactNode;
}

/**
 * Editorial section primitive (Onepirate cadence).
 *
 * Tones alternate cream/ink across the page to create the magazine rhythm.
 * Sizes map to --section-py-{sm,md,lg} from globals.css. Consumers should
 * compose page layouts as a stack of <Section tone="..."> blocks rather
 * than hand-rolling backgrounds + paddings.
 */
export function Section({
  tone = "sand",
  size = "md",
  width = "wide",
  className,
  children,
  ...rest
}: SectionProps) {
  const toneClass =
    tone === "ink" || tone === "cinema"
      ? "surface-cinema"
      : tone === "cream"
        ? "bg-[var(--color-card)] text-[var(--color-foreground)]"
        : "bg-[var(--color-sand)] text-[var(--color-foreground)]";

  const padY =
    size === "lg"
      ? "py-[var(--section-py-lg)]"
      : size === "sm"
        ? "py-[var(--section-py-sm)]"
        : "py-[var(--section-py-md)]";

  const inner =
    width === "narrow"
      ? "mx-auto w-full max-w-[var(--container-narrow)] px-6 sm:px-10"
      : "mx-auto w-full max-w-7xl px-6 sm:px-10";

  return (
    <section className={cn("relative", toneClass, className)} {...rest}>
      <div className={cn(inner, padY)}>{children}</div>
    </section>
  );
}
