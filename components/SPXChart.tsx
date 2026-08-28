"use client";

import { useEffect, useState, useRef } from "react";

type Candle = { open: number; high: number; low: number; close: number; volume: number };

function toQuarter(v: number): number {
  return Math.round(v * 4) / 4;
}

function randomWick(): number {
  return toQuarter(Math.random() * 1.25);
}

function genCandle(open: number, variety: string): { close: number; high: number; low: number } {
  const step = Math.random() > 0.5 ? 0.25 : 0.5;
  let close: number;
  let topWick = randomWick();
  let bottomWick = randomWick();

  if (variety === "pin") {
    // long-wick rejection: long one side, small body
    const dir = Math.random() > 0.5 ? 1 : -1;
    close = toQuarter(open + dir * 0.25);
    if (Math.random() > 0.5) topWick = toQuarter(0.75 + Math.random() * 0.5);
    else bottomWick = toQuarter(0.75 + Math.random() * 0.5);
  } else if (variety === "marubozu") {
    const dir = Math.random() > 0.5 ? 1 : -1;
    close = toQuarter(open + dir * (0.75 + Math.random() * 0.75));
    topWick = toQuarter(Math.random() * 0.25);
    bottomWick = toQuarter(Math.random() * 0.25);
  } else if (variety === "doji") {
    close = toQuarter(open + (Math.random() > 0.5 ? 0.25 : -0.25) * (Math.random() > 0.5 ? 0 : 1));
    topWick = toQuarter(0.25 + Math.random() * 0.5);
    bottomWick = toQuarter(0.25 + Math.random() * 0.5);
  } else {
    // standard
    const dir = Math.random() > 0.5 ? 1 : -1;
    const delta = dir * step * (1 + Math.floor(Math.random() * 2));
    close = toQuarter(open + delta);
  }

  const high = toQuarter(Math.max(open, close) + topWick);
  const low = toQuarter(Math.min(open, close) - bottomWick);
  return { close, high, low };
}

function genInitial(): Candle[] {
  const candles: Candle[] = [];
  let price = 5500;
  const V_BASE = 1200;
  for (let i = 0; i < 30; i++) {
    const open = toQuarter(price);
    const r = Math.random();
    let variety = "standard";
    if (r < 0.15) variety = "pin";
    else if (r < 0.30) variety = "marubozu";
    else if (r < 0.40) variety = "doji";
    const { close, high, low } = genCandle(open, variety);
    const vol = Math.round(V_BASE * (0.75 + Math.random() * 0.5)); // 900-1500
    candles.push({ open, high, low, close, volume: vol });
    price = close;
  }
  return candles;
}

function fTau(tau: number): number {
  return 0.35 * Math.sqrt(tau) + 0.65 * Math.pow(tau, 3);
}

export default function SPXChart() {
  const [mounted, setMounted] = useState(false);
  const [candles, setCandles] = useState<Candle[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const targetRef = useRef(1200);
  const activeOpenRef = useRef(5500);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    // Generate initial historical candles client-side only to avoid SSR hydration mismatch
    const initial = genInitial();
    const lastClose = initial[initial.length - 1].close;
    const open = toQuarter(lastClose);
    activeOpenRef.current = open;
    targetRef.current = 900 + Math.floor(Math.random() * 600); // 900-1500 upper bound for active candle
    elapsedRef.current = 0;
    const newCandle: Candle = { open, high: open, low: open, close: open, volume: 0 };
    setCandles([...initial.slice(1), newCandle]);
  }, [mounted]);

  // Tab Visibility Throttling: Zombie Execution Guard - pause ticks when tab hidden
  useEffect(() => {
    if (!mounted) return;
    let tickInterval: ReturnType<typeof setInterval> | null = null;
    let rollInterval: ReturnType<typeof setInterval> | null = null;

    const tickPriceAction = () => {
      elapsedRef.current = Math.min(60, elapsedRef.current + 0.2);
      const tau = elapsedRef.current / 60;
      const targetVol = targetRef.current * fTau(tau);
      const maxAllowedVol = Math.round(targetVol);
      setCandles(prev => {
        if (prev.length === 0) return prev;
        const arr = [...prev];
        const lastIdx = arr.length - 1;
        const last = { ...arr[lastIdx] };
        const open = activeOpenRef.current;
        const prevClose = last.close;
        const step = Math.random() > 0.5 ? 0.25 : 0.5;
        const dir = Math.random() > 0.5 ? 1 : -1;
        let newClose = toQuarter(prevClose + dir * step);
        const max = toQuarter(open + 1.25);
        const min = toQuarter(open - 1.25);
        if (newClose > max) newClose = max;
        if (newClose < min) newClose = min;
        const deltaP = newClose - prevClose;
        last.close = newClose;
        last.high = toQuarter(Math.max(last.high, newClose));
        last.low = toQuarter(Math.min(last.low, newClose));
        // Discrete volume bursts: only when price moves; up to 1/8 of target at edges for noticeable jumps, capped by fTau curve
        if (deltaP === 0) {
          // no volume increment when flat
        } else {
          const isNotable = Math.abs(deltaP) >= 0.5;
          const oneEighth = Math.floor(targetRef.current / 8); // up to ~112-187 for 900-1500
          const isEdge = tau < 0.25 || tau > 0.75; // initial or nearing end
          let burst: number;
          if (isNotable) {
            const maxNotable = isEdge ? oneEighth : 85;
            const minNotable = 15;
            const range = Math.max(1, maxNotable - minNotable + 1);
            burst = Math.floor(minNotable + Math.random() * range); // [15, oneEighth] at edges else [15,85]
          } else {
            const maxNormal = isEdge ? Math.max(10, Math.floor(oneEighth / 3)) : 10; // up to ~37 at edges
            burst = Math.floor(1 + Math.random() * maxNormal); // [1, maxNormal]
          }
          const remaining = maxAllowedVol - last.volume;
          const actualBurst = remaining > 0 ? Math.min(burst, remaining) : 0;
          last.volume = Math.min(last.volume + actualBurst, maxAllowedVol);
        }
        arr[lastIdx] = last;
        return arr;
      });
    };

    const rollAction = () => {
      setCandles(prev => {
        if (prev.length === 0) return prev;
        const lastClose = prev[prev.length - 1].close;
        const open = toQuarter(lastClose);
        activeOpenRef.current = open;
        targetRef.current = 900 + Math.floor(Math.random() * 600);
        elapsedRef.current = 0;
        const newCandle: Candle = { open, high: open, low: open, close: open, volume: 0 };
        return [...prev.slice(1), newCandle];
      });
    };

    const startSimulation = () => {
      if (!tickInterval) {
        tickInterval = setInterval(tickPriceAction, 200);
        tickRef.current = tickInterval;
      }
      if (!rollInterval) {
        rollInterval = setInterval(rollAction, 60000);
        rollRef.current = rollInterval;
      }
    };

    const stopSimulation = () => {
      if (tickInterval) {
        clearInterval(tickInterval);
        tickInterval = null;
        tickRef.current = null;
      }
      if (rollInterval) {
        clearInterval(rollInterval);
        rollInterval = null;
        rollRef.current = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopSimulation();
      } else {
        startSimulation();
      }
    };

    // Initial startup if tab is focused
    if (!document.hidden) {
      startSimulation();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopSimulation();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [mounted]);

  if (!mounted) {
    return (
      <div className="w-full max-w-[1300px] mx-auto h-[420px] bg-dark-900 border border-border-dark flex items-center justify-center font-mono text-xs text-slate-500">
        <span>INITIALIZING LIVE SIMULATION FEED...</span>
      </div>
    );
  }

  const width = 1100;
  const height = 320;
  const volHeight = 80;
  const paddingLeft = 56;
  const paddingRight = 12;
  const paddingTop = 24;
  const paddingBottom = 24;
  const chartWidth = width - paddingLeft - paddingRight;

  if (candles.length === 0) {
    return (
      <div className="w-full max-w-[1300px] mx-auto h-[420px] bg-dark-900 border border-border-dark flex items-center justify-center font-mono text-xs text-slate-500">
        <span>INITIALIZING LIVE SIMULATION FEED...</span>
      </div>
    );
  }

  const allHigh = Math.max(...candles.map(c => c.high));
  const allLow = Math.min(...candles.map(c => c.low));
  const range = allHigh - allLow || 2;
  const pad = range * 0.22;
  const maxPrice = toQuarter(allHigh + pad);
  const minPrice = toQuarter(allLow - pad);
  const priceToY = (p: number) => paddingTop + ((maxPrice - p) / (maxPrice - minPrice)) * (height - paddingTop - paddingBottom);
  const maxVol = 1500; // fixed baseline for scaling so historical 900-1500 visible, active 0-1500 grows
  const yTicks = 5;
  const priceTicks = Array.from({ length: yTicks + 1 }, (_, i) => {
    const pct = i / yTicks;
    const price = maxPrice - pct * (maxPrice - minPrice);
    const y = paddingTop + pct * (height - paddingTop - paddingBottom);
    return { price: toQuarter(price), y };
  });

  return (
    <div suppressHydrationWarning className="w-full max-w-[1300px] mx-auto min-h-[420px] border border-border-dark bg-dark-700 overflow-hidden py-8 px-6 opacity-0 animate-[pageFadeIn_0.4s_ease-out_forwards]">
      <div className="flex items-center justify-between border-b border-border-dark bg-dark-900 px-3 py-2 -mx-6 -mt-8 mb-6">
        <span className="text-[11px] tracking-widest text-slate-500 flex items-center gap-1.5"><span className="h-2 w-2 icon-grad-telemetry" /> [MARKET SIMULATION // 1M CANDLES]</span>
        <span className="text-[11px] tracking-widest text-slate-500 flex items-center gap-1.5"><span className="h-1.5 w-1.5 bg-accent-green animate-pulse" /> LIVE SIMULATION</span>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height + volHeight + 30}`} width="100%" height={height + volHeight + 30} className="block bg-dark-700" role="img" aria-label="Live 1m candlestick">
          {priceTicks.map(t => (
            <g key={t.price}>
              <line x1={paddingLeft} x2={width - paddingRight} y1={t.y} y2={t.y} stroke="#1e293b" strokeWidth={1} strokeDasharray="2 4" opacity={0.45} />
              <text suppressHydrationWarning x={6} y={t.y + 3} fontSize={10} fill="#64748b" fontFamily="ui-monospace,monospace">{t.price.toFixed(2)}</text>
            </g>
          ))}
          {candles.map((c, i) => {
            const isGreen = c.close >= c.open;
            const color = isGreen ? "#10b981" : "#f43f5e";
            const x = paddingLeft + (i * chartWidth) / 30 + (chartWidth / 30) * 0.15;
            const w = (chartWidth / 30) * 0.7;
            const highY = priceToY(c.high);
            const lowY = priceToY(c.low);
            const openY = priceToY(c.open);
            const closeY = priceToY(c.close);
            const bodyTop = Math.min(openY, closeY);
            const bodyH = Math.max(2.5, Math.abs(closeY - openY));
            return (
              <g key={i} style={{ opacity: 0, animation: `pageFadeIn 0.5s ease-out calc(var(--index) * 50ms) forwards`, ["--index" as unknown as string]: i } as React.CSSProperties}>
                <line x1={x + w / 2} x2={x + w / 2} y1={highY} y2={lowY} stroke={color} strokeWidth={1.3} />
                <rect x={x} y={bodyTop} width={w} height={bodyH} fill={color} stroke={color} />
              </g>
            );
          })}
          {candles.map((c, i) => {
            const x = paddingLeft + (i * chartWidth) / 30 + (chartWidth / 30) * 0.2;
            const w = (chartWidth / 30) * 0.6;
            const h = (c.volume / maxVol) * (volHeight - 12);
            const y = height + 14 + (volHeight - 12 - h);
            const isGreen = c.close >= c.open;
            const col = isGreen ? "rgba(16,185,129,0.9)" : "rgba(244,63,94,0.9)";
            return <rect key={`v-${i}`} x={x} y={y} width={w} height={h} fill={col} style={{ opacity: 0, animation: `pageFadeIn 0.3s ease-out calc(${i} * 50ms) forwards` }} />;
          })}
          <text suppressHydrationWarning x={6} y={height + 20} fontSize={9} fill="#475569" fontFamily="ui-monospace,monospace">VOL</text>
          {candles.map((_, i) => i % 5 === 0 && (
            <text suppressHydrationWarning key={`x-${i}`} x={paddingLeft + (i * chartWidth) / 30 + (chartWidth / 30) / 2} y={height + volHeight + 22} fontSize={9} fill="#475569" textAnchor="middle" fontFamily="ui-monospace,monospace">{`${String(i).padStart(2,"0")}m`}</text>
          ))}
        </svg>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-dark bg-dark-900 px-4 py-3 -mx-6 -mb-8 mt-6">
        <span className="text-xs tracking-wide text-slate-400">Finance &amp; Cybersecurity Frameworks</span>
        <a href="/projects" className="border border-border-dark bg-white px-4 py-1.5 text-xs font-bold tracking-widest text-dark-900 hover:bg-slate-100">DISCOVER PROJECTS</a>
      </div>
    </div>
  );
}
