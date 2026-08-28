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
  const initialSnapshotRef = useRef<string>(JSON.stringify(data));
  const isDirtyRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const periodicTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prevResetKeyRef = useRef<string | undefined>(resetKey);

  const isVisible = useCallback(() => {
    if (typeof document === "undefined") return true;
    return document.visibilityState === "visible";
  }, []);

  useEffect(() => {
    dataRef.current = data;
    saveFnRef.current = saveFn;
  });

  // Call this when new data is loaded from server to reset baseline and prevent false-dirty
  const resetBaseline = useCallback((freshData: T) => {
    initialSnapshotRef.current = JSON.stringify(freshData);
    dataRef.current = freshData;
    isDirtyRef.current = false;
    setError(null);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setStatus("idle");
  }, []);

  // Backward compat: if resetKey changes externally (e.g., workspace selectedId), reset baseline to current data
  useEffect(() => {
    if (prevResetKeyRef.current !== resetKey) {
      prevResetKeyRef.current = resetKey;
      // Don't mark dirty; treat current data as baseline until explicit resetBaseline with fresh payload
      initialSnapshotRef.current = JSON.stringify(dataRef.current);
      isDirtyRef.current = false;
      setError(null);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setStatus("idle");
    }
  }, [resetKey]);

  const executeSave = useCallback(async () => {
    if (!isDirtyRef.current || !enabled) return;
    if (!isVisible()) return;
    setStatus("syncing");
    setError(null);
    try {
      await saveFnRef.current(dataRef.current);
      initialSnapshotRef.current = JSON.stringify(dataRef.current);
      isDirtyRef.current = false;
      setStatus("saved");
      setTimeout(() => {
        setStatus((prev) => (prev === "saved" ? "idle" : prev));
      }, 3000);
    } catch (err) {
      console.error("[useDebouncedSave] Save failed:", err);
      setStatus("error");
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [enabled, isVisible]);

  useEffect(() => {
    if (!enabled) return;

    // Compare against baseline snapshot to prevent false-dirty triggers on hydration
    let currentSerialized: string;
    try {
      currentSerialized = JSON.stringify(data);
    } catch {
      currentSerialized = String(data);
    }
    if (currentSerialized === initialSnapshotRef.current) {
      return;
    }

    isDirtyRef.current = true;
    setStatus("syncing");

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      executeSave();
    }, delayMs);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [data, delayMs, enabled, executeSave]);

  // Periodic 60s emergency safety flush during continuous typing (visibility-guarded)
  useEffect(() => {
    if (!enabled) return;
    periodicTimerRef.current = setInterval(() => {
      if (isDirtyRef.current && isVisible()) {
        executeSave();
      }
    }, 60000);

    return () => {
      if (periodicTimerRef.current) clearInterval(periodicTimerRef.current);
    };
  }, [enabled, executeSave, isVisible]);

  useEffect(() => {
    const onVis = () => {
      // No-op flush guard: avoid firing while hidden, but when visible again pending dirty will flush on next interval or edit
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVis);
      return () => document.removeEventListener("visibilitychange", onVis);
    }
    return () => {};
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (periodicTimerRef.current) clearInterval(periodicTimerRef.current);
    };
  }, []);

  return { status, error, flush: executeSave, resetBaseline };
}
