import Link from "next/link";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  href?: string;
}

export function BrandMark({ className, href = "/" }: Props) {
  const inner = (
    <span className="flex items-center gap-2 text-xl font-bold tracking-tight">
      <span
        aria-hidden="true"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-base font-bold shadow-sm"
      >
        D
      </span>
      <span>
        Dodo<span className="text-[var(--color-primary)]">Stays</span>
      </span>
    </span>
  );
  return (
    <Link href={href} className={cn("inline-flex", className)}>
      {inner}
    </Link>
  );
}
