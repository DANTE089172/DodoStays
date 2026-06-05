"use client";

import { useCallback, useMemo, type KeyboardEvent } from "react";
import type { HostStepDef } from "@/lib/wizard";
import { cn } from "@/lib/utils";

interface JournalStepperProps {
  steps: HostStepDef[];
  currentStepId: string;
  completedStepIds: string[];
  onJump?: (stepId: string) => void;
}

export function JournalStepper({
  steps,
  currentStepId,
  completedStepIds,
  onJump,
}: JournalStepperProps) {
  const completed = useMemo(
    () => new Set(completedStepIds),
    [completedStepIds],
  );

  const isReachable = useCallback(
    (key: string) => key === currentStepId || completed.has(key),
    [currentStepId, completed],
  );

  const handleJump = useCallback(
    (key: string) => {
      if (!onJump) return;
      if (!isReachable(key)) return;
      onJump(key);
    },
    [onJump, isReachable],
  );

  const handleKey = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>, key: string) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleJump(key);
      }
    },
    [handleJump],
  );

  return (
    <nav
      aria-label="Listing wizard steps"
      className="w-full lg:w-[260px] lg:shrink-0"
    >
      {/* Mobile: horizontal pill list. Desktop: vertical rail. */}
      <ol
        className={cn(
          "flex gap-2 overflow-x-auto pb-2",
          "lg:flex-col lg:gap-1.5 lg:overflow-visible lg:border-l lg:border-[var(--color-border)] lg:pb-0 lg:pl-4",
        )}
      >
        {steps.map((step, idx) => {
          const isActive = step.key === currentStepId;
          const isComplete = completed.has(step.key);
          const isFuture = !isActive && !isComplete;
          const reachable = isReachable(step.key);

          return (
            <li key={step.key} className="lg:w-full">
              <button
                type="button"
                aria-current={isActive ? "step" : undefined}
                aria-disabled={!reachable}
                disabled={!onJump || !reachable}
                onClick={() => handleJump(step.key)}
                onKeyDown={(e) => handleKey(e, step.key)}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-[8px] border border-transparent px-3 py-2 text-left transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]",
                  isActive &&
                    "border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)]",
                  !isActive &&
                    reachable &&
                    "hover:bg-[var(--color-muted)] cursor-pointer",
                  !reachable && "cursor-default",
                )}
              >
                {/* glyph slot — peach-bordered circle with the step number */}
                <span
                  aria-hidden
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[1.5px] font-[family-name:var(--font-plex)] text-sm font-medium transition-colors",
                    isActive &&
                      "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]",
                    isComplete &&
                      "border-[var(--color-primary)] bg-transparent text-[var(--color-primary)]",
                    isFuture &&
                      "border-[var(--color-border)] bg-transparent text-[var(--color-muted-foreground)]",
                  )}
                >
                  {isComplete && !isActive ? (
                    // thin peach checkmark
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2.5 7.5 L5.5 10.5 L11.5 3.5" />
                    </svg>
                  ) : (
                    String(idx + 1).padStart(2, "0")
                  )}
                </span>

                <span className="flex min-w-0 flex-col">
                  <span
                    className={cn(
                      "font-[family-name:var(--font-fraunces)] text-[18px] font-medium leading-snug",
                      isActive && "text-[var(--color-ink)]",
                      isComplete && !isActive && "text-[var(--color-ink)]",
                      isFuture && "text-[var(--color-muted-foreground)]",
                    )}
                  >
                    {step.title}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default JournalStepper;
