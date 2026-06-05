import { useCallback, useEffect, useRef, useState } from "react";

export type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: Date }
  | { kind: "error"; message: string };

/**
 * Debounced auto-save hook. Pass an async save function;
 * returns a `flush()` you can call manually (e.g. on "Next" click)
 * and a `state` you can render in the saved-indicator.
 */
export function useAutoSave<T>(
  value: T,
  save: (value: T) => Promise<void>,
  delayMs = 800,
): { state: SaveState; flush: () => Promise<void>; markDirty: () => void } {
  const [state, setState] = useState<SaveState>({ kind: "idle" });
  const valueRef = useRef(value);
  const dirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const doSave = useCallback(async () => {
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    setState({ kind: "saving" });
    try {
      await save(valueRef.current);
      setState({ kind: "saved", at: new Date() });
    } catch (err) {
      setState({ kind: "error", message: (err as Error).message });
      // Mark dirty again so the next markDirty() / flush() retries
      dirtyRef.current = true;
    }
  }, [save]);

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
    setState((s) => (s.kind === "error" ? s : { kind: "idle" }));
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { void doSave(); }, delayMs);
  }, [doSave, delayMs]);

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    await doSave();
  }, [doSave]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { state, flush, markDirty };
}

/**
 * Friendly "saved 12s ago" formatter.
 */
export function timeAgo(date: Date, now: Date = new Date()): string {
  const seconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}
