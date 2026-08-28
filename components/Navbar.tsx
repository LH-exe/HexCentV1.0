"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  Shield,
  LogOut,
  LogIn,
  Hexagon,
  User,
} from "lucide-react";

type Role = "ADMIN" | "GUEST" | null;

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<Role>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Edge-auth check (<5ms, no Node lambda) — replaces heavy /api/admin/stats polling
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.role === "ADMIN") setRole("ADMIN");
        else if (d.role === "GUEST" || d.authenticated) setRole("GUEST");
        else {
          if (typeof document !== "undefined" && document.cookie.includes("hexcent_session")) {
            setRole("GUEST");
          } else {
            setRole(null);
          }
        }
      })
      .catch(() => setRole(null));
  }, [pathname]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setRole(null);
    router.push("/login");
    router.refresh();
  }

  if (pathname === "/login") return null;

  const isAdmin = role === "ADMIN";

  const navItems = [
    { href: "/", label: "Overview", icon: LayoutDashboard, show: true },
    { href: "/about", label: "About", icon: User, show: true },
    { href: "/projects", label: "Projects", icon: FolderKanban, show: true },
    { href: "/workspace", label: "Workspace", icon: FileText, show: isAdmin },
    { href: "/admin", label: "Admin", icon: Shield, show: isAdmin },
  ].filter((i) => i.show);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border-dark bg-dark-900">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center border border-border-dark bg-dark-700">
            <Hexagon className="h-5 w-5 text-accent-cyan" />
          </div>
          <div className="hidden sm:block">
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-sm font-bold tracking-[0.12em] text-white">HEXCENT</span>
              <span className="font-mono text-[10px] tracking-widest text-slate-500">v1.0</span>
            </div>
            <p className="font-mono text-[10px] tracking-widest text-slate-500 -mt-0.5">Personal Projects &amp; Engineering Hub</p>
          </div>
          <span className="sm:hidden font-mono text-sm font-bold tracking-widest text-white">HEXCENT</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 border px-3 py-1.5 font-mono text-xs tracking-wide",
                  active
                    ? "bg-dark-700 text-white border-border-light"
                    : "text-slate-400 hover:text-white hover:bg-dark-700 border-transparent"
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                [{item.label}]
              </Link>
            );
          })}
        </nav>

        <nav className="flex md:hidden items-center gap-1">
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "p-2 border",
                  active
                    ? "bg-dark-700 text-white border-border-light"
                    : "text-slate-500 border-transparent"
                )}
                aria-label={item.label}
              >
                <item.icon className="h-4 w-4" />
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          {mounted && role && (
            <div
              className={cn(
                "hidden sm:flex items-center gap-1.5 border px-3 py-1.5 font-mono text-[11px] tracking-widest",
                role === "ADMIN"
                  ? "border-accent-cyan/30 bg-dark-700 text-accent-cyan"
                  : "border-border-dark bg-dark-700 text-slate-400"
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5",
                  role === "ADMIN" ? "icon-grad-telemetry" : "bg-slate-500"
                )}
                style={role === "ADMIN" ? { background: "linear-gradient(135deg, #00f0ff, #2563eb)" } : undefined}
              />
              {role}
            </div>
          )}
          {mounted && role ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 border border-border-dark bg-dark-700 px-3 py-1.5 font-mono text-xs text-slate-300 hover:text-white hover:border-border-light"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">[Logout]</span>
              <span className="sm:hidden">Logout</span>
            </button>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 border border-border-dark bg-dark-700 px-3 py-1.5 font-mono text-xs text-slate-300 hover:text-white hover:border-border-light"
            >
              <LogIn className="h-3.5 w-3.5" />
              [Login]
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
