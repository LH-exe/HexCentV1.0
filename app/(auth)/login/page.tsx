"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Shield, Users, Hexagon, Lock, AlertTriangle, Terminal, Eye, EyeOff } from "lucide-react";

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [loadingGuest, setLoadingGuest] = useState(false);

  async function handleAdminSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = password.trim();
    if (!trimmed) {
      setError("Password required");
      triggerShake();
      return;
    }
    if (trimmed.length > 72) {
      setError("Password too long");
      triggerShake();
      return;
    }
    setLoadingAdmin(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Authentication failed");
        triggerShake();
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError("Network error");
      triggerShake();
    } finally {
      setLoadingAdmin(false);
    }
  }

  async function handleGuest() {
    setLoadingGuest(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/guest", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Guest entry failed");
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoadingGuest(false);
    }
  }

  function triggerShake() {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  }

  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center py-10 px-4 font-mono page-fade-in">
      <div className="w-full max-w-5xl grid lg:grid-cols-[1.05fr_0.95fr] gap-6 items-stretch">
        <div className="hidden lg:flex flex-col justify-between border border-border-dark bg-dark-700 p-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center border border-border-dark bg-dark-900">
                <Hexagon className="h-6 w-6 text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-bold tracking-[0.14em] text-white">HEXCENT</p>
                <p className="text-[10px] tracking-widest text-slate-500">Personal Projects &amp; Engineering Hub</p>
              </div>
            </div>
            <div className="mt-8 border border-border-dark bg-dark-900 p-4">
              <div className="flex items-center gap-2 text-[11px] tracking-widest text-slate-500">
                <Terminal className="h-3.5 w-3.5" /> TERMINAL — WELCOME
              </div>
              <div className="mt-3 space-y-3 text-xs leading-relaxed text-slate-400">
                <p>HexCent is a personal engineering workspace.</p>
                <div className="space-y-1.5 pt-2 border-t border-border-dark">
                  <p className="flex items-center gap-2"><span className="h-1.5 w-1.5 bg-accent-cyan" /> Quantitative Research</p>
                  <p className="flex items-center gap-2"><span className="h-1.5 w-1.5 bg-accent-cyan" /> Distributed Systems</p>
                  <p className="flex items-center gap-2"><span className="h-1.5 w-1.5 bg-accent-cyan" /> Web Interfaces</p>
                </div>
                <p className="pt-2 text-[11px] text-slate-600">Sign in to manage workspace and projects. Guest mode is read-only.</p>
              </div>
            </div>
          </div>
          <div className="border border-border-dark bg-dark-900 p-4 text-xs">
            <p className="text-[11px] tracking-widest text-slate-500">ACCESS</p>
            <p className="mt-2 leading-relaxed text-slate-500">Admin unlocks workspace and system controls. Guest can browse overview, about, and projects.</p>
          </div>
        </div>

        <div className="border border-border-dark bg-dark-700">
          <div className="h-px w-full bg-border-dark" />
          <div className="p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold tracking-[0.12em] text-white">SIGN IN</h2>
              <span className="border border-border-dark bg-dark-900 px-2 py-0.5 text-[10px] tracking-widest text-slate-500">AUTH</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Choose how to continue</p>

            <form onSubmit={handleAdminSubmit} className={`mt-6 space-y-4 ${shake ? "animate-shake" : ""}`}>
              <div>
                <label className="text-[11px] tracking-[0.12em] text-slate-400">ADMIN PASSWORD</label>
                <div className="mt-2 relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value.slice(0, 72))}
                    placeholder="••••••••"
                    maxLength={72}
                    className="w-full border border-border-dark bg-dark-900 pl-10 pr-10 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-border-light"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    aria-label="Toggle password"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 border border-accent-red/30 bg-accent-red/10 px-3 py-2.5 text-xs text-accent-red">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loadingAdmin}
                className="w-full flex items-center justify-center gap-2 border border-border-dark bg-white py-3 text-sm font-bold tracking-widest text-dark-900 hover:bg-slate-100 disabled:opacity-60"
              >
                {loadingAdmin ? (
                  <span className="h-4 w-4 animate-spin border-2 border-dark-900/30 border-t-dark-900" />
                ) : (
                  <Shield className="h-4 w-4" />
                )}
                {loadingAdmin ? "VERIFYING..." : "CONTINUE AS ADMIN"}
              </button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-border-dark" />
              <span className="text-[11px] tracking-[0.14em] text-slate-600">OR</span>
              <div className="h-px flex-1 bg-border-dark" />
            </div>

            <button
              onClick={handleGuest}
              disabled={loadingGuest}
              className="w-full flex items-center justify-center gap-2 border border-border-dark bg-dark-900 py-3 text-sm font-bold tracking-widest text-slate-200 hover:text-white hover:border-border-light disabled:opacity-60"
            >
              {loadingGuest ? (
                <span className="h-4 w-4 animate-spin border-2 border-slate-500/30 border-t-slate-500" />
              ) : (
                <Users className="h-4 w-4" />
              )}
              {loadingGuest ? "ENTERING..." : "CONTINUE AS GUEST"}
            </button>
            <p className="mt-2 text-center text-[11px] tracking-wide text-slate-600">
              Read-only access
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center font-mono text-xs text-slate-600">Loading...</div>}>
      <LoginInner />
    </Suspense>
  );
}
