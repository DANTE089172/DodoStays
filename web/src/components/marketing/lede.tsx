import * as React from "react";
import { cn } from "@/lib/utils";

interface LedeProps {
  children: React.ReactNode;
  className?: string;
  /** Tighten max-width when used inside narrow columns. */
  size?: "narrow" | "wide";
  as?: "p" | "div";
}

/**
 * Editorial introductory paragraph (Onepirate lede).
 *
 * 18px on mobile, 20px on tablet+. Plex Sans, 1.6 line-height, muted-foreground.
 * Pairs with <DisplayHeading> as the typical hero / section intro.
 */
export function Lede({
  children,
  className,
  size = "narrow",
  as: As = "p",
}: LedeProps) {
  return (
    <As
      className={cn(
        "ds-lede",
        size === "wide" && "max-w-none",
        className,
      )}
    >
      {children}
    </As>
  );
}
