"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "solid" | "ghost";
type Size = "sm" | "md" | "lg";

interface PillButtonBaseProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
}

type PillButtonProps = PillButtonBaseProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className">;

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-5 text-[11px]",
  md: "h-11 px-7 text-[13px]",
  lg: "h-12 px-8 text-[14px]",
};

/**
 * Onepirate's signature arched (rounded-full) button.
 *
 *  - solid: peach fill, ink text. Hover darkens via --color-primary-hover.
 *  - ghost: 1.5px ink ring, ink text, transparent background.
 *           Hover fills with peach + flips text to ink.
 *
 * Plex Sans, uppercase, 0.12em tracking, font-medium. NOT used in the wizard
 * chrome — those keep the existing <Button> primitive.
 */
const baseClasses = [
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full",
  "font-medium uppercase tracking-[0.12em]",
  "transition-[background-color,color,border-color,opacity] duration-200 ease-out",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]",
  "disabled:pointer-events-none disabled:opacity-50",
].join(" ");

const variantClasses: Record<Variant, string> = {
  solid:
    "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)]",
  ghost:
    "border-[1.5px] border-[var(--color-foreground)] bg-transparent text-[var(--color-foreground)] hover:bg-[var(--color-primary)] hover:text-[var(--color-primary-foreground)] hover:border-[var(--color-primary)]",
};

/**
 * Class string builder — useful for stitching pill styles onto a Next.js
 * <Link> directly without nesting anchors. Mirrors the same variant/size knobs
 * the components expose.
 */
export function pillButtonClasses(opts: {
  variant?: Variant;
  size?: Size;
  className?: string;
} = {}) {
  const { variant = "solid", size = "md", className } = opts;
  return cn(baseClasses, variantClasses[variant], sizeClasses[size], className);
}

export const PillButton = React.forwardRef<HTMLButtonElement, PillButtonProps>(
  ({ variant = "solid", size = "md", className, children, ...rest }, ref) => (
    <button
      ref={ref}
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  ),
);
PillButton.displayName = "PillButton";

interface PillLinkProps
  extends PillButtonBaseProps,
    Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "className"> {
  href: string;
}

/** Anchor variant for use inside Next.js <Link> wrappers (or as a direct <a>). */
export const PillLink = React.forwardRef<HTMLAnchorElement, PillLinkProps>(
  ({ variant = "solid", size = "md", className, children, ...rest }, ref) => (
    <a
      ref={ref}
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...rest}
    >
      {children}
    </a>
  ),
);
PillLink.displayName = "PillLink";
