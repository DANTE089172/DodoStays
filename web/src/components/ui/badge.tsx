import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-[2px] border-[1.5px] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] transition-colors duration-200",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--color-primary)] text-[var(--color-primary-foreground)]",
        secondary:
          "border-transparent bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)]",
        success:
          "border-transparent bg-[var(--color-cane)] text-[var(--color-success-foreground)]",
        muted:
          "border-transparent bg-[var(--color-muted)] text-[var(--color-muted-foreground)]",
        outline:
          "border-[var(--color-border)] bg-transparent text-[var(--color-foreground)]",
        accent:
          "border-transparent bg-[var(--color-accent)] text-[var(--color-accent-foreground)]",
        script:
          "border-[var(--color-cane)] bg-transparent text-[var(--color-cane)] normal-case tracking-normal text-sm px-2.5 py-0",
        "script-ochre":
          "border-[var(--color-ochre)] bg-transparent text-[var(--color-ochre)] normal-case tracking-normal text-sm px-2.5 py-0",
        "script-flamboyant":
          "border-[var(--color-flamboyant)] bg-transparent text-[var(--color-flamboyant)] normal-case tracking-normal text-sm px-2.5 py-0",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
