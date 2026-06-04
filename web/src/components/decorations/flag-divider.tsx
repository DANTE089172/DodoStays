import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  width?: "full" | "short";
}

/**
 * 4-segment colour bar inspired by the Mauritian flag — cobalt, flamboyant, ochre, cane.
 * Order is intentionally NOT the flag order, so it reads as "ours".
 */
export function FlagDivider({ className, width = "full" }: Props) {
  const w = width === "short" ? "w-12" : "w-full";
  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={cn("flex h-[1.5px]", w, className)}
    >
      <span className="flex-1 bg-[var(--color-cobalt)]" />
      <span className="flex-1 bg-[var(--color-flamboyant)]" />
      <span className="flex-1 bg-[var(--color-ochre)]" />
      <span className="flex-1 bg-[var(--color-cane)]" />
    </div>
  );
}
