"use client";

import { useEffect, useState } from "react";

// EDIT HERE: Set your personal GitHub profile URL
const GITHUB_PROFILE_URL = "https://github.com/lh-exe";

export default function Footer() {
  const [dateTimeStr, setDateTimeStr] = useState<string>("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const updateDateTime = () => {
      const now = new Date();
      const formatted = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(now);

      // Reformat standard US "MM/DD/YYYY, HH:mm:ss" -> "YYYY-MM-DD HH:mm:ss EST"
      const parts = formatted.split(", ");
      if (parts.length === 2) {
        const [m, d, y] = parts[0].split("/");
        setDateTimeStr(`${y}-${m}-${d} ${parts[1]} EST`);
      } else {
        setDateTimeStr(`${formatted} EST`);
      }
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="bg-[#010305] border-t border-[#1e293b] py-3.5 font-mono rounded-none">
      <div className="flex items-center justify-between w-full max-w-[1400px] mx-auto px-4 sm:px-6">
        <span className="tracking-[0.14em] text-white font-bold text-xs">HEXCENT v1.0 // PERSONAL PLATFORM</span>
        <div className="flex items-center gap-3">
          <a
            href={GITHUB_PROFILE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-border-dark bg-dark-900 px-2.5 py-1 text-xs tracking-widest text-slate-400 hover:text-white hover:border-slate-600 rounded-none transition-colors"
          >
            GitHub
          </a>
          <span className="text-[11px] tracking-widest border border-border-dark bg-dark-900 px-2.5 py-1 text-slate-400 rounded-none min-w-[195px] text-center">
            {mounted ? dateTimeStr : "----/--/-- --:--:-- EST"}
          </span>
        </div>
      </div>
    </footer>
  );
}
