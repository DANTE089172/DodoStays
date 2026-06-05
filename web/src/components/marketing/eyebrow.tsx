import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "peach" | "ink" | "muted";

interface EyebrowProps {
  children: React.ReactNode;
  tone?: Tone;
  as?: "span" | "p" | "div";
  className?: string;
}

/**
 * Tracked-caps editorial eyebrow (Onepirate "overline").
 *
 * Replaces the old Caveat script eyebrow pattern. Always Plex Sans, 12px,
 * 0.18em tracking, uppercase, font-weight 500. Tone controls colour:
 *  - "peach" (default) -> primary brand colour
 *  - "ink"    -> foreground (use over light surfaces with dense copy)
 *  - "muted"  -> muted-foreground (use as a quiet metadata label)
 */
export function Eyebrow({
  children,
  tone = "peach",
  as: As = "span",
  className,
}: EyebrowProps) {
  const toneClass =
    tone === "ink"
      ? "text-[var(--color-foreground)]"
      : tone === "muted"
        ? "text-[var(--color-muted-foreground)]"
        : "text-[var(--color-primary)]";

  return (
    <As className={cn("ds-eyebrow", toneClass, className)}>{children}</As>
  );
}
