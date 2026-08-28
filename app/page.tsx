import Link from "next/link";
import Typewriter from "@/components/Typewriter";
import SPXChart from "@/components/SPXChart";

export default function OverviewPage() {
  const intro = `Welcome to HexCent!
This is my personal website for projects, notes, and system controls.
Feel free to check out my many projects, or say hello and get in touch with me!`;
  return (
    <div className="space-y-6 font-mono page-fade-in">
      <section className="w-full max-w-[1300px] mx-auto border border-border-dark bg-dark-700 p-6 sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">HexCent</h1>
        <p className="mt-1 text-sm tracking-wide text-slate-500">Personal Projects &amp; Engineering Hub</p>

        <div className="mt-6 border border-border-dark bg-dark-900 p-4">
          <div className="flex items-center gap-2 text-[11px] tracking-widest text-slate-500 mb-3">
            <span className="h-2 w-2 icon-grad-telemetry" />
            HEXCENT CONSOLE
          </div>
          <p className="text-sm leading-relaxed text-slate-300 min-h-[4.5rem] whitespace-pre-line">
            <Typewriter text={intro} speed={18} />
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/projects" className="inline-flex items-center gap-2 border border-border-dark bg-white px-5 py-2 text-xs font-bold tracking-widest text-dark-900 hover:scale-[1.02] hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] active:scale-95 transition-all duration-200">
            VIEW PROJECTS
          </Link>
          <Link href="/about" className="inline-flex items-center gap-2 border border-border-dark bg-dark-900 px-5 py-2 text-xs tracking-widest text-slate-300 hover:text-white hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(0,240,255,0.2)] hover:scale-[1.02] active:scale-95 transition-all duration-200">
            ABOUT ME
          </Link>
        </div>
      </section>

      <SPXChart />
    </div>
  );
}
