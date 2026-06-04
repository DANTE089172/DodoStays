import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  opacity?: number;
}

/**
 * Subtle ochre block-printed motif — alternating diamond + circle, repeating
 * tile. Used as a low-opacity background on the homepage "How it works"
 * section and the auth pages.
 */
export function BatikPattern({ className, opacity = 0.04 }: Props) {
  return (
    <svg
      role="presentation"
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full",
        className
      )}
      style={{ opacity }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          id="batik-tile"
          x="0"
          y="0"
          width="56"
          height="56"
          patternUnits="userSpaceOnUse"
        >
          {/* diamond top-left */}
          <path
            d="M14 4 L24 14 L14 24 L4 14 Z"
            fill="none"
            stroke="var(--color-ochre)"
            strokeWidth="1"
          />
          {/* dot in centre of diamond */}
          <circle cx="14" cy="14" r="1.4" fill="var(--color-ochre)" />
          {/* circle bottom-right */}
          <circle
            cx="42"
            cy="42"
            r="8"
            fill="none"
            stroke="var(--color-ochre)"
            strokeWidth="1"
          />
          <circle cx="42" cy="42" r="1.4" fill="var(--color-ochre)" />
          {/* small cross top-right */}
          <path
            d="M42 10 L42 18 M38 14 L46 14"
            stroke="var(--color-ochre)"
            strokeWidth="1"
            strokeLinecap="round"
          />
          {/* small cross bottom-left */}
          <path
            d="M14 38 L14 46 M10 42 L18 42"
            stroke="var(--color-ochre)"
            strokeWidth="1"
            strokeLinecap="round"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#batik-tile)" />
    </svg>
  );
}
