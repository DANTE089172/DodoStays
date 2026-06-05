"use client";

// TODO: remove before launch — this is the Plan 05.2 chrome demo route.
// Renders every wizard chrome component in a few states so we can eyeball
// them without wiring up the real edit page yet.

import { useState } from "react";
import { HOST_STEPS, type HostStepKey } from "@/lib/wizard";
import {
  JournalGlyph,
  type JournalGlyphName,
  JournalPage,
  JournalStepper,
  JournalFooter,
  SavedIndicator,
  RibbonToast,
  PencilSkeleton,
  type RibbonToastTone,
} from "@/components/wizard";

const ALL_GLYPHS: JournalGlyphName[] = [
  "compass",
  "bed",
  "kitchen",
  "camera",
  "calendar",
  "price",
  "rules",
  "preview",
];

export default function WizardPreviewPage() {
  const [currentStep, setCurrentStep] = useState<HostStepKey>("location");
  const [completed, setCompleted] = useState<HostStepKey[]>(["basics"]);
  // Lazy initialisers — allowed to call impure functions per the
  // react-hooks/purity rule, since they only run on the very first render.
  const [savedAt, setSavedAt] = useState<Date | null>(
    () => new Date(Date.now() - 32_000),
  );
  const [staleSavedAt] = useState<Date>(
    () => new Date(Date.now() - 5 * 60_000),
  );
  const [isSaving, setIsSaving] = useState(false);

  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    tone: RibbonToastTone;
  }>({ open: false, message: "", tone: "info" });

  const fakeSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setSavedAt(new Date());
    }, 800);
  };

  const advance = () => {
    const idx = HOST_STEPS.findIndex((s) => s.key === currentStep);
    if (idx >= 0 && !completed.includes(currentStep)) {
      setCompleted([...completed, currentStep]);
    }
    const next = HOST_STEPS[Math.min(idx + 1, HOST_STEPS.length - 1)];
    setCurrentStep(next.key);
    fakeSave();
  };

  const goBack = () => {
    const idx = HOST_STEPS.findIndex((s) => s.key === currentStep);
    if (idx > 0) setCurrentStep(HOST_STEPS[idx - 1].key);
  };

  const currentIdx = HOST_STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="min-h-screen bg-[var(--color-background)] px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-16">
        <header>
          <p className="font-[family-name:var(--font-caveat)] text-lg italic text-[var(--color-primary)]">
            dev preview
          </p>
          <h1 className="font-[family-name:var(--font-fraunces)] text-4xl font-semibold text-[var(--color-ink)]">
            Wizard chrome — Plan 05.2
          </h1>
          <p className="mt-2 max-w-prose font-[family-name:var(--font-plex)] text-[15px] text-[var(--color-muted-foreground)]">
            All seven journal-chrome components rendered in a couple of states each.
            Not part of the real product surface — delete before launch.
          </p>
        </header>

        {/* === Full layout: stepper + page + footer ============================ */}
        <section>
          <h2 className="mb-4 font-[family-name:var(--font-fraunces)] text-2xl text-[var(--color-ink)]">
            Stepper + Page + Footer (live)
          </h2>
          <div className="flex flex-col gap-8 lg:flex-row">
            <JournalStepper
              steps={HOST_STEPS}
              currentStepId={currentStep}
              completedStepIds={completed}
              onJump={(id) => setCurrentStep(id as HostStepKey)}
            />

            <div className="flex-1">
              <JournalPage
                pageNumber={currentIdx + 1}
                totalPages={HOST_STEPS.length}
                kicker={`partie ${currentIdx + 1}`}
                title={HOST_STEPS[currentIdx].title}
                description="A simple, restrained step page. Warm sand surface, single radial-fibre texture at 4% opacity, Fraunces title and Plex body copy."
              >
                <div className="space-y-3">
                  <p className="font-[family-name:var(--font-plex)] text-[15px] text-[var(--color-ink)]">
                    Imagine the form fields for this step here. For now we just show
                    a pencil skeleton to demonstrate the loading state:
                  </p>
                  <PencilSkeleton lines={4} />
                </div>
              </JournalPage>

              <JournalFooter
                onBack={currentIdx === 0 ? undefined : goBack}
                onNext={advance}
                nextLabel={
                  currentIdx === HOST_STEPS.length - 1 ? "Publish" : "Continue"
                }
                isSaving={isSaving}
                lastSavedAt={savedAt}
                onSaveDraft={fakeSave}
              />
            </div>
          </div>
        </section>

        {/* === Saved indicator states ========================================= */}
        <section>
          <h2 className="mb-4 font-[family-name:var(--font-fraunces)] text-2xl text-[var(--color-ink)]">
            Saved indicator
          </h2>
          <div className="flex flex-col gap-3 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-card)] p-6">
            <div className="flex items-center gap-4">
              <span className="w-32 text-xs uppercase tracking-widest text-[var(--color-muted-foreground)]">
                Saving
              </span>
              <SavedIndicator isSaving={true} lastSavedAt={null} />
            </div>
            <div className="flex items-center gap-4">
              <span className="w-32 text-xs uppercase tracking-widest text-[var(--color-muted-foreground)]">
                Just saved
              </span>
              <SavedIndicator isSaving={false} lastSavedAt={new Date()} />
            </div>
            <div className="flex items-center gap-4">
              <span className="w-32 text-xs uppercase tracking-widest text-[var(--color-muted-foreground)]">
                Saved a while ago
              </span>
              <SavedIndicator
                isSaving={false}
                lastSavedAt={staleSavedAt}
              />
            </div>
            <div className="flex items-center gap-4">
              <span className="w-32 text-xs uppercase tracking-widest text-[var(--color-muted-foreground)]">
                Idle (renders nothing)
              </span>
              <SavedIndicator isSaving={false} lastSavedAt={null} />
            </div>
          </div>
        </section>

        {/* === Glyphs grid ==================================================== */}
        <section>
          <h2 className="mb-4 font-[family-name:var(--font-fraunces)] text-2xl text-[var(--color-ink)]">
            Journal glyphs
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {ALL_GLYPHS.map((g) => (
              <div
                key={g}
                className="flex flex-col items-center gap-2 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-card)] p-6"
              >
                <JournalGlyph name={g} size={36} tone="peach" />
                <span className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-muted-foreground)]">
                  {g}
                </span>
              </div>
            ))}
          </div>

          <h3 className="mt-6 font-[family-name:var(--font-fraunces)] text-lg text-[var(--color-ink)]">
            Tones
          </h3>
          <div className="mt-2 flex gap-6 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-card)] p-6">
            <JournalGlyph name="compass" size={36} tone="peach" />
            <JournalGlyph name="compass" size={36} tone="ink" />
            <JournalGlyph name="compass" size={36} tone="sand" />
          </div>
        </section>

        {/* === Skeleton variations ============================================ */}
        <section>
          <h2 className="mb-4 font-[family-name:var(--font-fraunces)] text-2xl text-[var(--color-ink)]">
            Pencil skeleton
          </h2>
          <div className="space-y-6 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-card)] p-6">
            <PencilSkeleton lines={1} />
            <PencilSkeleton lines={3} />
            <PencilSkeleton lines={6} />
          </div>
        </section>

        {/* === Ribbon toast triggers ========================================== */}
        <section>
          <h2 className="mb-4 font-[family-name:var(--font-fraunces)] text-2xl text-[var(--color-ink)]">
            Ribbon toast
          </h2>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-[6px] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2 text-sm hover:bg-[var(--color-muted)]"
              onClick={() =>
                setToast({
                  open: true,
                  message: "Draft saved — mo gardé",
                  tone: "success",
                })
              }
            >
              Show success
            </button>
            <button
              type="button"
              className="rounded-[6px] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2 text-sm hover:bg-[var(--color-muted)]"
              onClick={() =>
                setToast({
                  open: true,
                  message: "Listing previewed in a new tab.",
                  tone: "info",
                })
              }
            >
              Show info
            </button>
            <button
              type="button"
              className="rounded-[6px] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2 text-sm hover:bg-[var(--color-muted)]"
              onClick={() =>
                setToast({
                  open: true,
                  message: "Couldn't save — connection dropped.",
                  tone: "error",
                })
              }
            >
              Show error
            </button>
          </div>
          <RibbonToast
            open={toast.open}
            message={toast.message}
            tone={toast.tone}
            onClose={() => setToast((t) => ({ ...t, open: false }))}
          />
        </section>
      </div>
    </div>
  );
}
