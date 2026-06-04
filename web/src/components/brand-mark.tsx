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
  return (
    <Link href={href} className={cn("inline-flex items-center", className)}>
      <span
        className={cn(
          "font-display text-2xl tracking-[-0.02em]",
          colour
        )}
      >
        Dodo<span className="italic">Stays</span>
      </span>
    </Link>
  );
}
