"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export function useDebouncedSave<T>(
  data: T,
  saveFn: (payload: T) => Promise<void>,
  delayMs: number = 1500,
  enabled: boolean = true,
  resetKey?: string
) {
  const [status, setStatus] = useState<"idle" | "syncing" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const dataRef = useRef<T>(data);
  const saveFnRef = useRef(saveFn);
  const isFirstRender = useRef(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const periodicTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isDirtyRef = useRef(false);
  const prevResetKeyRef = useRef<string | undefined>(resetKey);
  const skipNextDirtyRef = useRef(false);

  useEffect(() => {
    dataRef.current = data;
    saveFnRef.current = saveFn;
  });

  const executeSave = useCallback(async () => {
    if (!isDirtyRef.current || !enabled) return;
    setStatus("syncing");
    setError(null);
    try {
      await saveFnRef.current(dataRef.current);
      isDirtyRef.current = false;
      setStatus("saved");
    } catch (err) {
      console.error("[useDebouncedSave] Save failed:", err);
      setStatus("error");
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [enabled]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevResetKeyRef.current = resetKey;
      // Initialize as saved, not syncing, for initial load
      setStatus("saved");
      return;
    }

    if (resetKey !== prevResetKeyRef.current) {
      prevResetKeyRef.current = resetKey;
      skipNextDirtyRef.current = true;
      isDirtyRef.current = false;
      setStatus("saved");
      setError(null);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    if (skipNextDirtyRef.current) {
      skipNextDirtyRef.current = false;
      isDirtyRef.current = false;
      setStatus("saved");
      setError(null);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    if (!enabled) return;

    isDirtyRef.current = true;
    setStatus("syncing");

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      executeSave();
    }, delayMs);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [data, delayMs, enabled, executeSave, resetKey]);

  // Periodic fallback flush (every 60s during continuous typing)
  useEffect(() => {
    if (!enabled) return;
    periodicTimerRef.current = setInterval(() => {
      if (isDirtyRef.current) {
        executeSave();
      }
    }, 60000);

    return () => {
      if (periodicTimerRef.current) clearInterval(periodicTimerRef.current);
    };
  }, [enabled, executeSave]);

  // Do not cancel pending saves on unmount - let them flush
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (periodicTimerRef.current) clearInterval(periodicTimerRef.current);
    };
  }, []);

  return { status, error, flush: executeSave };
}
