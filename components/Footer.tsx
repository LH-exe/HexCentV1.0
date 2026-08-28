"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Footer() {
  const [utc, setUtc] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setUtc(now.toISOString().replace("T", " ").slice(0, 19) + " UTC");
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <footer className="bg-[#010305] border-t border-[#1e293b] py-6 px-6 sm:px-12 font-mono">
      <div className="mx-auto max-w-[1400px] flex flex-col lg:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <span className="tracking-[0.14em] text-white font-bold">HEXCENT v1.0 // PERSONAL PLATFORM</span>
          <span className="flex items-center gap-1.5 border border-accent-green/20 bg-accent-green/10 px-2 py-0.5 text-[11px] tracking-widest text-accent-green">
            <span className="h-1.5 w-1.5 bg-accent-green animate-pulse" /> [ALL SYSTEMS ONLINE]
          </span>
        </div>

        <nav className="flex items-center gap-1 text-slate-500">
          <Link href="/" className="border border-transparent px-2 py-1 hover:text-white hover:border-border-dark">[Overview]</Link>
          <Link href="/about" className="border border-transparent px-2 py-1 hover:text-white hover:border-border-dark">[About]</Link>
          <Link href="/projects" className="border border-transparent px-2 py-1 hover:text-white hover:border-border-dark">[Projects]</Link>
          <Link href="/workspace" className="border border-transparent px-2 py-1 hover:text-white hover:border-border-dark">[Workspace]</Link>
        </nav>

        <div className="flex items-center gap-3 text-slate-600">
          <a href="https://github.com" target="_blank" rel="noopener" className="border border-border-dark bg-dark-900 px-2 py-1 text-slate-400 hover:text-white">GITHUB</a>
          <a href="mailto:hello@hexcent.dev" className="border border-border-dark bg-dark-900 px-2 py-1 text-slate-400 hover:text-white">EMAIL</a>
          <span className="hidden sm:inline text-[11px] tracking-widest border border-border-dark bg-dark-900 px-2 py-1 text-slate-500">{utc}</span>
        </div>
      </div>
    </footer>
  );
}
