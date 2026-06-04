import { cn } from "@/lib/utils";

interface Props {
  className?: string;
}

/**
 * Single hand-drawn-feeling wavy line in ochre. Used to separate sections in
 * forms / detail pages.
 */
export function WaveDivider({ className }: Props) {
  return (
    <svg
      role="presentation"
      aria-hidden="true"
      className={cn("h-4 w-full text-[var(--color-ochre)]", className)}
      viewBox="0 0 600 16"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0 8 C 30 0, 60 16, 100 8 S 170 0, 210 8 S 280 16, 320 8 S 390 0, 430 8 S 500 16, 540 8 S 600 0, 600 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
