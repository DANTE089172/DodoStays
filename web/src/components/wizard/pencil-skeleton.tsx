"use client";

import { cn } from "@/lib/utils";

interface PencilSkeletonProps {
  lines?: number;
  className?: string;
}

/**
 * Loading skeleton with a hand-drawn feel — thin peach-tinted lines that
 * shimmer subtly. Used while wizard step content loads.
 */
export function PencilSkeleton({ lines = 3, className }: PencilSkeletonProps) {
  return (
    <div
      className={cn("flex flex-col gap-3", className)}
      role="status"
      aria-label="Loading"
    >
      {Array.from({ length: Math.max(1, lines) }).map((_, i) => (
        <PencilLine key={i} index={i} total={lines} />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

function PencilLine({ index, total }: { index: number; total: number }) {
  // Last line is shorter than the rest — mimics handwritten paragraphs.
  const widthPct = index === total - 1 ? 62 : 92 - ((index * 7) % 16);
  // Each line gets a slightly different baseline phase so the wave isn't perfectly aligned.
  const phaseShift = index * 11;

  return (
    <svg
      width="100%"
      height="14"
      viewBox={`0 0 200 14`}
      preserveAspectRatio="none"
      style={{ width: `${widthPct}%` }}
      aria-hidden
    >
      <path
        d={`M0 7 Q 50 ${5 + (phaseShift % 3)} 100 7 T 200 ${7 + ((phaseShift + 1) % 3)}`}
        fill="none"
        stroke="var(--color-primary)"
        strokeOpacity="0.35"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <animate
          attributeName="stroke-opacity"
          values="0.18; 0.4; 0.18"
          dur="1.6s"
          begin={`${index * 0.15}s`}
          repeatCount="indefinite"
        />
      </path>
    </svg>
  );
}

export default PencilSkeleton;
