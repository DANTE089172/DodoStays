"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Color-grade options for editorial listing photography.
 *
 * - `warm`   — subtle teal-orange pull, used on cream/sand surfaces (default).
 * - `moody`  — slight desaturation + lift, used on `tone="ink"` surfaces so
 *              photography sits visually inside the cinema treatment.
 * - `none`   — escape hatch; no filter applied (e.g. brand-mark, SVG inline).
 *
 * Implemented as a CSS variable reference (`var(--photo-grade-warm)`) so the
 * actual filter chain lives in `globals.css` next to the rest of the tokens.
 * Never inline color literals here.
 */
export type PhotoGrade = "warm" | "moody" | "none";

type ImgProps = Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  "src" | "alt" | "ref"
>;

export interface CinematicPhotoProps extends ImgProps {
  src: string;
  alt: string;
  /** Color-grade preset; defaults to `warm`. */
  grade?: PhotoGrade;
  /** Optional className appended to the image element. */
  className?: string;
}

const GRADE_VAR: Record<PhotoGrade, string | undefined> = {
  warm: "var(--photo-grade-warm)",
  moody: "var(--photo-grade-moody)",
  none: undefined,
};

/**
 * Editorial photo wrapper that applies a CSS-variable filter chain on top of a
 * plain `<img>` element. The codebase does not use `next/image` (verified via
 * grep), so this stays a thin, drop-in replacement for `<img>` — same props,
 * same DOM, same alt-text-driven a11y, just one extra `style.filter` layer.
 */
export const CinematicPhoto = React.forwardRef<
  HTMLImageElement,
  CinematicPhotoProps
>(function CinematicPhoto(
  { src, alt, grade = "warm", className, style, ...rest },
  ref,
) {
  const filter = GRADE_VAR[grade];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt={alt}
      data-photo-grade={grade}
      className={cn(className)}
      style={filter ? { ...style, filter } : style}
      {...rest}
    />
  );
});
