import Link from "next/link";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  href?: string;
  tone?: "ink" | "sand";
}

export function BrandMark({ className, href = "/", tone = "ink" }: Props) {
  const colour =
    tone === "sand"
      ? "text-[var(--color-sand)]"
      : "text-[var(--color-foreground)]";
  const fillColour =
    tone === "sand" ? "var(--color-sand)" : "var(--color-foreground)";
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2", className)}>
      <DodoSilhouette fill={fillColour} />
      <span
        className={cn(
          "font-display text-2xl font-bold tracking-[0.01em]",
          colour
        )}
        style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100, "wght" 700' }}
      >
        DodoStays
      </span>
    </Link>
  );
}

function DodoSilhouette({ fill }: { fill: string }) {
  // Hand-drawn-feeling dodo: round body, plump tail tuft, hooked beak, stubby legs.
  return (
    <svg
      aria-hidden="true"
      width="22"
      height="18"
      viewBox="0 0 44 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8 22 C8 14, 14 9, 22 9 C28 9, 32 12, 33 16 C34 16.5, 36 17, 37.5 18 C39 19, 40 20.5, 39 21.5 C38 22.5, 35.5 22, 34 21.5 C33.5 24, 32 26, 30 27.5 L31.5 32 L28 32 L27 28.5 C25.5 29, 23.5 29, 22 28.7 L21 32.5 L17.5 32.5 L18.5 28 C13 26, 9.5 24, 8 22 Z"
        fill={fill}
      />
      {/* beak hook */}
      <path
        d="M37 17.5 C38.5 17, 40 17.5, 41 18.5 C40 18.8, 39 18.7, 38 18.2 Z"
        fill={fill}
      />
      {/* eye dot — knock out */}
      <circle cx="33" cy="15.5" r="0.9" fill="var(--color-background)" />
      {/* tail tuft */}
      <path
        d="M8 21 C5.5 20.5, 4 21.5, 3 23 C4.5 23, 6 22.5, 8 22.5 Z"
        fill={fill}
      />
    </svg>
  );
}
