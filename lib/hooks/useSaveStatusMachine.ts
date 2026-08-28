"use client";

import { useState, useRef, useCallback } from "react";

export type SaveState = "idle" | "syncing" | "saved" | "error";

export function useSaveStatusManager(holdSavedDurationMs: number = 2000) {
  const [status, setStatus] = useState<SaveState>("idle");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startSyncing = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus("syncing");
  }, []);

  const setSaved = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus("saved");
    timerRef.current = setTimeout(() => {
      setStatus("idle");
    }, holdSavedDurationMs);
  }, [holdSavedDurationMs]);

  const setError = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus("error");
  }, []);

  const setIdle = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus("idle");
  }, []);

  return { status, setStatus, startSyncing, setSaved, setError, setIdle };
}
