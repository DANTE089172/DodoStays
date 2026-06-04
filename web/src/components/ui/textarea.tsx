import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[120px] w-full rounded-[2px] border-[1.5px] border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm leading-relaxed text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] transition-[color,border-color] duration-200 ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-ring)] focus-visible:border-[var(--color-ring)] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
