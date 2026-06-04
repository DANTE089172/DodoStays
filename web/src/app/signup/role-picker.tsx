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
              "group relative flex cursor-pointer flex-col gap-0.5 rounded-lg border p-4 text-left transition-all",
              selected
                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-sm ring-1 ring-[var(--color-primary)]"
                : "border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-muted)]"
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
                "text-sm font-semibold",
                selected ? "text-[var(--color-primary)]" : "text-[var(--color-foreground)]"
              )}
            >
              {opt.title}
            </span>
            <span className="text-xs text-[var(--color-muted-foreground)]">{opt.subtitle}</span>
            <span
              aria-hidden="true"
              className={cn(
                "absolute right-3 top-3 inline-flex h-4 w-4 items-center justify-center rounded-full border transition-colors",
                selected
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                  : "border-[var(--color-border)] bg-[var(--color-card)]"
              )}
            >
              {selected && (
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="2.5 6.5 5 9 9.5 3.5" />
                </svg>
              )}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
