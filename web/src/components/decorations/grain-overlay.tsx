import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  opacity?: number;
}

/**
 * SVG turbulence noise — placed absolute over hero photos for a subtle
 * print-grain feel. mix-blend-mode: multiply darkens slightly.
 */
export function GrainOverlay({ className, opacity = 0.05 }: Props) {
  return (
    <svg
      role="presentation"
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full",
        className
      )}
      style={{ mixBlendMode: "multiply", opacity }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <filter id="grain-noise">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.9"
          numOctaves="2"
          seed="7"
          stitchTiles="stitch"
        />
        <feColorMatrix
          type="matrix"
          values="0 0 0 0 0.10
                  0 0 0 0 0.08
                  0 0 0 0 0.06
                  0 0 0 1 0"
        />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain-noise)" />
    </svg>
  );
}
