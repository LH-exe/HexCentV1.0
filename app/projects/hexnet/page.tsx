import Link from "next/link";
import { Activity, Shield, Cpu, Layers, Database, ArrowUpRight } from "lucide-react";

export default function HexnetPage() {
  return (
    <div className="space-y-6 font-mono">
      <div className="border border-border-dark bg-dark-700 p-5 sm:p-6">
        <div className="flex items-center gap-2 text-[11px] tracking-widest text-slate-500">
          <span className="h-2 w-2 bg-amber-500" />
          STATUS: IN DEVELOPMENT / DISCONNECTED
        </div>
        <h1 className="mt-3 text-lg font-bold tracking-tight text-white flex items-center gap-2">
          <Activity className="h-5 w-5 text-slate-400" /> HEXNET
          <span className="border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] tracking-widest text-amber-400">IN DEVELOPMENT</span>
        </h1>
        <p className="mt-2 text-xs leading-relaxed text-slate-500 max-w-3xl">
          Institutional-grade quantitative research and backtesting framework built in Python / PyQt6 / Numba. No live market connection or execution controls are exposed through this site. This page is a static technical overview.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="border border-border-dark bg-dark-700 p-5">
          <h2 className="text-xs font-bold tracking-[0.14em] text-white flex items-center gap-1.5"><Cpu className="h-4 w-4 text-slate-500" /> ARCHITECTURE</h2>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-400 list-disc pl-4">
            <li>Multi-threaded backtesting engine (Numba-accelerated loops, Python orchestration)</li>
            <li>Walk-forward optimization with anchored/rolling windows</li>
            <li>Triple-barrier method for labeling (profit-take / stop-loss / time)</li>
            <li>Prop-firm Monte Carlo simulation (drawdown, payout, breach probability)</li>
            <li>PyQt6 desktop surface for research — decoupled from this web hub</li>
          </ul>
        </div>
        <div className="border border-border-dark bg-dark-700 p-5">
          <h2 className="text-xs font-bold tracking-[0.14em] text-white flex items-center gap-1.5"><Database className="h-4 w-4 text-slate-500" /> STACK</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="border border-border-dark bg-dark-900 p-3">
              <p className="text-[11px] tracking-widest text-slate-500">CORE</p>
              <p className="mt-1 text-slate-300">Python, Numba, PyQt6</p>
            </div>
            <div className="border border-border-dark bg-dark-900 p-3">
              <p className="text-[11px] tracking-widest text-slate-500">DATA</p>
              <p className="mt-1 text-slate-300">Parquet, Postgres (research DB)</p>
            </div>
            <div className="border border-border-dark bg-dark-900 p-3">
              <p className="text-[11px] tracking-widest text-slate-500">STATUS</p>
              <p className="mt-1 text-amber-400">Disconnected</p>
            </div>
            <div className="border border-border-dark bg-dark-900 p-3">
              <p className="text-[11px] tracking-widest text-slate-500">SITE ROLE</p>
              <p className="mt-1 text-slate-300">Overview only</p>
            </div>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-slate-500">This portal does not stream prices, display PnL, or offer kill-switch controls. Live execution remains out-of-scope for the web platform.</p>
        </div>
      </div>

      <div className="border border-border-dark bg-dark-700 p-5">
        <h2 className="text-xs font-bold tracking-[0.14em] text-white flex items-center gap-1.5"><Layers className="h-4 w-4 text-slate-500" /> MODULES</h2>
        <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="border border-border-dark bg-dark-900 p-3">
            <p className="font-bold text-white">Backtesting</p>
            <p className="mt-1 leading-relaxed text-slate-500">Event-driven, fee/slippage aware, thread-pool walk-forward.</p>
          </div>
          <div className="border border-border-dark bg-dark-900 p-3">
            <p className="font-bold text-white">Labeling</p>
            <p className="mt-1 leading-relaxed text-slate-500">Triple-barrier with volatility-adjusted horizons.</p>
          </div>
          <div className="border border-border-dark bg-dark-900 p-3">
            <p className="font-bold text-white">Simulation</p>
            <p className="mt-1 leading-relaxed text-slate-500">Monte Carlo for prop-firm rules — breach and payout curves.</p>
          </div>
          <div className="border border-border-dark bg-dark-900 p-3">
            <p className="font-bold text-white">Desktop</p>
            <p className="mt-1 leading-relaxed text-slate-500">PyQt6 research surface, decoupled — viewer pattern.</p>
          </div>
        </div>
      </div>

      <div className="border border-border-dark bg-dark-900 p-4 flex items-start gap-2 text-[11px] leading-relaxed text-slate-500">
        <Shield className="h-4 w-4 text-slate-600 mt-0.5 shrink-0" />
        <span>Note: No live telemetry or trading controls are available here. For local use, run the Hexnet desktop app separately. This hub remains viewer-only to avoid serverless execution overhead.</span>
      </div>

      <div className="flex gap-2">
        <Link href="/projects" className="inline-flex items-center gap-1.5 border border-border-dark bg-dark-700 px-4 py-2 text-xs tracking-widest text-slate-300 hover:text-white">
          BACK TO PROJECTS <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
