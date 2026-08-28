"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type SaveFn<T> = (value: T) => Promise<void>;

export function useDebouncedSave<T>(
  value: T,
  saveFn: SaveFn<T>,
  delay = 10000,
  enabled = true,
  resetKey?: string
) {
  const [status, setStatus] = useState<"idle" | "syncing" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const periodicRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const firstRender = useRef(true);
  const pendingRef = useRef<T | null>(null);
  const lastSavedRef = useRef<string | null>(null);
  const lastValueRef = useRef<string>("");
  const prevResetKeyRef = useRef<string | undefined>(resetKey);
  const skipNextDirtyRef = useRef(false);

  const isDirty = useCallback((val: T) => {
    const str = JSON.stringify(val);
    return str !== lastSavedRef.current;
  }, []);

  const flush = useCallback(async () => {
    if (pendingRef.current === null) return;
    const toSave = pendingRef.current;
    const str = JSON.stringify(toSave);
    if (str === lastSavedRef.current) {
      pendingRef.current = null;
      setStatus("saved");
      return;
    }
    pendingRef.current = null;
    setStatus("syncing");
    setError(null);
    try {
      await saveFn(toSave);
      lastSavedRef.current = str;
      setStatus("saved");
    } catch (e: unknown) {
      setStatus("error");
      setError(e instanceof Error ? e.message : String(e));
      // keep pending for retry? Re-queue
      pendingRef.current = toSave;
    }
  }, [saveFn]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      lastSavedRef.current = JSON.stringify(value);
      lastValueRef.current = JSON.stringify(value);
      prevResetKeyRef.current = resetKey;
      setStatus("saved");
      return;
    }
    if (resetKey !== prevResetKeyRef.current) {
      prevResetKeyRef.current = resetKey;
      // Defer resetting lastSaved until next value change to capture new doc's payload after state batch
      skipNextDirtyRef.current = true;
      pendingRef.current = null;
      setStatus("saved");
      setError(null);
      if (timerRef.current) clearTimeout(timerRef.current);
      // Update lastValue to current to avoid double handling, but keep lastSaved for next
      lastValueRef.current = JSON.stringify(value);
      return;
    }
    if (skipNextDirtyRef.current) {
      skipNextDirtyRef.current = false;
      lastSavedRef.current = JSON.stringify(value);
      lastValueRef.current = JSON.stringify(value);
      pendingRef.current = null;
      setStatus("saved");
      setError(null);
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    if (!enabled) return;

    const str = JSON.stringify(value);
    if (str === lastValueRef.current) return;
    lastValueRef.current = str;

    if (!isDirty(value)) {
      setStatus("saved");
      return;
    }

    pendingRef.current = value;
    setStatus("syncing");
    setError(null);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      flush();
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, delay, enabled, flush, isDirty, resetKey]);

  // Periodic forced save every 60s if dirty
  useEffect(() => {
    if (!enabled) return;
    periodicRef.current = setInterval(() => {
      if (pendingRef.current !== null && isDirty(pendingRef.current)) {
        if (timerRef.current) clearTimeout(timerRef.current);
        flush();
      }
    }, 60000);
    return () => {
      if (periodicRef.current) clearInterval(periodicRef.current);
    };
  }, [enabled, flush, isDirty]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (periodicRef.current) clearInterval(periodicRef.current);
    };
  }, []);

  return { status, error, flush };
}
