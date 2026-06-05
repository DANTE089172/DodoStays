"use client";

import { Button } from "@/components/ui/button";
import { SavedIndicator } from "./saved-indicator";

interface JournalFooterProps {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  isSaving?: boolean;
  lastSavedAt?: Date | null;
  onSaveDraft?: () => void;
}

/**
 * Bottom action row of the wizard. Status indicator on the left,
 * Save Draft (text) + Back (outline) + Next (primary) on the right.
 *
 * Pass `onBack` only when there is a previous step (omit on step 0).
 */
export function JournalFooter({
  onBack,
  onNext,
  nextLabel = "Continue",
  nextDisabled = false,
  isSaving = false,
  lastSavedAt = null,
  onSaveDraft,
}: JournalFooterProps) {
  return (
    <div className="mt-8 flex flex-col gap-3 border-t border-[var(--color-border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-h-[1.25rem]">
        <SavedIndicator isSaving={isSaving} lastSavedAt={lastSavedAt} />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {onSaveDraft ? (
          <Button variant="ghost" size="sm" onClick={onSaveDraft} type="button">
            Save draft
          </Button>
        ) : null}
        {onBack ? (
          <Button variant="outline" onClick={onBack} type="button">
            Back
          </Button>
        ) : null}
        <Button
          variant="default"
          onClick={onNext}
          disabled={nextDisabled}
          type="button"
        >
          {nextLabel}
        </Button>
      </div>
    </div>
  );
}

export default JournalFooter;
