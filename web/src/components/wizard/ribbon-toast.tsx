"use client";

import { useEffect } from "react";

export type RibbonToastTone = "success" | "error" | "info";

interface RibbonToastProps {
  open: boolean;
  message: string;
  onClose: () => void;
  tone?: RibbonToastTone;
}

/**
 * Corner toast styled like a slipped-in journal ribbon. Slides in from the
 * bottom-right, cream surface with a peach edge ribbon on the left.
 *
 * Auto-dismisses after 4 seconds; the parent owns the `open` state.
 */
export function RibbonToast({
  open,
  message,
  onClose,
  tone = "info",
}: RibbonToastProps) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => onClose(), 4000);
    return () => clearTimeout(t);
  }, [open, onClose]);

  if (!open) return null;

  const role = tone === "error" ? "alert" : "status";
  const ariaLive = tone === "error" ? "assertive" : "polite";

  // Single peach accent for the ribbon edge regardless of tone — the icon /
  // ink dot conveys tone without introducing extra colours per the
  // minimalism direction.
  const dotClass =
    tone === "success"
      ? "bg-[var(--color-cane)]"
      : tone === "error"
        ? "bg-[var(--color-destructive)]"
        : "bg-[var(--color-ink)]";

  return (
    <div
      role={role}
      aria-live={ariaLive}
      className="pointer-events-none fixed bottom-6 right-6 z-50 flex max-w-sm animate-[ribbon-in_280ms_ease-out_both]"
      style={{
        // Inline keyframes via style attribute would be heavier; rely on the
        // inline animation name which we register below in <style jsx global>.
      }}
    >
      <div
        className="pointer-events-auto flex items-stretch overflow-hidden rounded-[6px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[2px_2px_0_var(--color-ink)]"
      >
        {/* peach ribbon edge on the left */}
        <span
          aria-hidden
          className="w-1.5 shrink-0 bg-[var(--color-primary)]"
        />
        <div className="flex items-center gap-3 px-4 py-3">
          <span
            aria-hidden
            className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`}
          />
          <p className="font-[family-name:var(--font-plex)] text-sm text-[var(--color-ink)]">
            {message}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Dismiss notification"
            className="ml-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-ink)]"
          >
            <span aria-hidden>×</span>
          </button>
        </div>
      </div>

      {/* Local keyframe — scoped via a unique animation name. */}
      <style>{`
        @keyframes ribbon-in {
          from { opacity: 0; transform: translate(8px, 8px); }
          to   { opacity: 1; transform: translate(0, 0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-\\[ribbon-in_280ms_ease-out_both\\] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

export default RibbonToast;
