"use client";

import { cn } from "@/lib/utils";

interface Props {
  value: "Guest" | "Host";
  onChange: (role: "Guest" | "Host") => void;
}

const OPTIONS: { value: "Guest" | "Host"; title: string; subtitle: string }[] = [
  {
    value: "Guest",
    title: "I'm a guest",
    subtitle: "Looking for a stay",
  },
  {
    value: "Host",
    title: "I'm a host",
    subtitle: "Renting out my place",
  },
];

export function RolePicker({ value, onChange }: Props) {
  return (
    <fieldset className="grid grid-cols-2 gap-3">
      {OPTIONS.map((opt) => {
        const selected = value === opt.value;
        return (
          <label
            key={opt.value}
            className={cn(
              "group relative flex cursor-pointer flex-col gap-1 border p-4 text-left transition-colors duration-200 ease-out",
              selected
                ? "border-[var(--color-foreground)] bg-[var(--color-foreground)] text-[var(--color-sand)]"
                : "border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-foreground)]"
            )}
          >
            <input
              type="radio"
              name="role"
              value={opt.value}
              checked={selected}
              onChange={() => onChange(opt.value)}
              className="sr-only"
            />
            <span
              className={cn(
                "font-display text-lg tracking-[-0.01em]",
                selected ? "text-[var(--color-sand)]" : "text-[var(--color-foreground)]"
              )}
            >
              {opt.title}
            </span>
            <span
              className={cn(
                "text-xs",
                selected
                  ? "text-[var(--color-sand)]/75"
                  : "text-[var(--color-muted-foreground)]"
              )}
            >
              {opt.subtitle}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
