"use client";

import { useEffect, useState } from "react";
import { Cpu, Activity, Shield, Terminal, Database, Zap, Code, Plus, Trash2, ChevronUp, ChevronDown, Save, Edit3, X, ExternalLink } from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = { Cpu, Activity, Shield, Terminal, Database, Zap, Code };
const iconOptions = ["Cpu", "Activity", "Shield", "Terminal", "Database", "Zap", "Code"];

type Column = {
  id: string;
  width: "full" | "1/2" | "1/3";
  title: string;
  subtitle?: string;
  bio?: string;
  icon: string;
  iconGradient: string;
  chips?: string[];
  links?: { label: string; href: string }[];
  mediaUrl?: string;
  mediaType?: "image" | "video";
};

type Row = { id: string; columns: Column[] };

const defaultLayout: Row[] = [
  {
    id: "hero_row",
    columns: [
      { id: "col_hero", width: "full", title: "HexCent Architect", subtitle: "Quantitative Systems & Full-Stack Security Engineer", bio: "Building institutional algorithmic backtesting engines, high-throughput financial data pipelines, and responsive web platforms.", icon: "Cpu", iconGradient: "linear-gradient(135deg, #00f0ff, #4338ca)", chips: ["Python", "PyQt6", "Next.js"], links: [{ label: "GitHub", href: "#" }] },
    ],
  },
  {
    id: "domains_row",
    columns: [
      { id: "col_quant", width: "1/2", title: "Quantitative Finance", subtitle: "Research & Execution", bio: "Multi-threaded backtesting, walk-forward optimization, and statistical barrier testing.", icon: "Activity", iconGradient: "linear-gradient(135deg, #10b981, #0e7490)" },
      { id: "col_cyber", width: "1/2", title: "Systems & Cybersecurity", subtitle: "Infra & Trust", bio: "Low-level optimization, rate-limiting architectures, and zero-trust authentication.", icon: "Shield", iconGradient: "linear-gradient(135deg, #a855f7, #3b82f6)" },
    ],
  },
];

function uid() { return Math.random().toString(36).slice(2, 9); }

function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (u.hostname === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0];
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (u.hostname.includes("youtube.com") && u.pathname.startsWith("/embed/")) return url;
  } catch {}
  return null;
}

export default function AboutPage() {
  const [rows, setRows] = useState<Row[]>(defaultLayout);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [labelsDraft, setLabelsDraft] = useState<Record<string, string>>({});
  const [linksDraft, setLinksDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" }).then(r => r.json()).then(d => { if (d.role === "ADMIN") setIsAdmin(true); }).catch(()=>{});
    fetch("/api/about", { cache: "no-store" }).then(r => r.json()).then(d => {
      if (Array.isArray(d.layout) && d.layout.length > 0 && d.layout[0]?.columns) setRows(d.layout);
    }).catch(()=>{}).finally(()=> setLoaded(true));
  }, []);

  async function handleSave() {
    setSaving(true);
    // flush any pending drafts
    const flushed = rows.map(r => ({
      ...r,
      columns: r.columns.map(c => {
        let chips = c.chips;
        let links = c.links;
        if (labelsDraft[c.id] !== undefined) {
          chips = labelsDraft[c.id].split(",").map(s=>s.trim()).filter(Boolean);
        }
        if (linksDraft[c.id] !== undefined) {
          const raw = linksDraft[c.id];
          links = raw.split(",").map(s=>s.trim()).filter(Boolean).map(s=>{ const [label, href] = s.split("|").map(x=>x.trim()); return { label: label ?? s, href: href ?? "#" }; });
        }
        return { ...c, chips, links };
      })
    }));
    try {
      const res = await fetch("/api/about", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ layout: flushed }) });
      if (!res.ok) throw new Error("Save failed");
      setRows(flushed);
      setLabelsDraft({}); setLinksDraft({});
      setEditMode(false);
    } catch (e) { alert(e instanceof Error ? e.message : String(e)); }
    finally { setSaving(false); }
  }

  function addRow(kind: "full" | "split" | "triple") {
    if (kind === "full") {
      setRows(p => [...p, { id: uid(), columns: [{ id: uid(), width: "full", title: "New Section", subtitle: "Subtitle", bio: "Enter bio...", icon: "Terminal", iconGradient: "linear-gradient(135deg, #00f0ff, #4338ca)" }] }]);
    } else if (kind === "split") {
      setRows(p => [...p, { id: uid(), columns: [
        { id: uid(), width: "1/2", title: "Column 1", bio: "Content...", icon: "Cpu", iconGradient: "linear-gradient(135deg, #00f0ff, #4338ca)" },
        { id: uid(), width: "1/2", title: "Column 2", bio: "Content...", icon: "Shield", iconGradient: "linear-gradient(135deg, #10b981, #0e7490)" },
      ] }]);
    } else {
      setRows(p => [...p, { id: uid(), columns: [
        { id: uid(), width: "1/3", title: "Col 1", bio: "...", icon: "Zap", iconGradient: "linear-gradient(135deg, #a855f7, #3b82f6)" },
        { id: uid(), width: "1/3", title: "Col 2", bio: "...", icon: "Database", iconGradient: "linear-gradient(135deg, #00f0ff, #2563eb)" },
        { id: uid(), width: "1/3", title: "Col 3", bio: "...", icon: "Code", iconGradient: "linear-gradient(135deg, #00f0ff, #4338ca)" },
      ] }]);
    }
  }

  function moveRow(id: string, dir: -1 | 1) {
    setRows(prev => {
      const idx = prev.findIndex(r => r.id === id);
      const nidx = idx + dir;
      if (nidx < 0 || nidx >= prev.length) return prev;
      const arr = [...prev]; const [item] = arr.splice(idx, 1); arr.splice(nidx, 0, item); return arr;
    });
  }
  function removeRow(id: string) { setRows(p => p.filter(r => r.id !== id)); }
  function updateColumn(rowId: string, colId: string, patch: Partial<Column>) {
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, columns: r.columns.map(c => c.id === colId ? { ...c, ...patch } : c) } : r));
  }
  function removeColumn(rowId: string, colId: string) {
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, columns: r.columns.filter(c => c.id !== colId) } : r).filter(r => r.columns.length > 0));
  }
  function addColumnToRow(rowId: string) {
    setRows(prev => prev.map(r => r.id === rowId && r.columns.length < 3 ? { ...r, columns: [...r.columns, { id: uid(), width: "1/3", title: "New", bio: "...", icon: "Code", iconGradient: "linear-gradient(135deg, #00f0ff, #4338ca)" }] } : r));
  }

  if (!loaded) return <div className="page-fade-in border border-border-dark bg-dark-700 p-6 text-xs text-slate-500">Loading...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-mono page-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">About Me</h1>
          <p className="mt-1 text-xs text-slate-500">Who I am, what I like to do, and what to look forward to</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button onClick={() => setEditMode(v => !v)} className={`border px-3 py-1.5 text-xs tracking-widest ${editMode ? "bg-white text-dark-900" : "bg-dark-700 text-slate-300 border-border-dark"}`}>
              {editMode ? <><X className="inline h-3 w-3 mr-1" /> EXIT</> : <><Edit3 className="inline h-3 w-3 mr-1" /> EDIT LAYOUT</>}
            </button>
            {editMode && <button onClick={handleSave} disabled={saving} className="border border-accent-cyan/30 bg-accent-cyan px-3 py-1.5 text-xs font-bold tracking-widest text-dark-900 disabled:opacity-50">{saving ? "SAVING..." : <><Save className="inline h-3 w-3 mr-1" /> SAVE</>}</button>}
          </div>
        )}
      </div>

      {editMode && (
        <div className="border border-border-dark bg-dark-900 p-3 flex flex-wrap gap-2 text-xs">
          <span className="text-slate-500 py-1">Add row:</span>
          <button onClick={() => addRow("full")} className="border border-border-dark bg-dark-700 px-3 py-1 text-slate-300">Full Width (1 col)</button>
          <button onClick={() => addRow("split")} className="border border-border-dark bg-dark-700 px-3 py-1 text-slate-300">Split (2 col)</button>
          <button onClick={() => addRow("triple")} className="border border-border-dark bg-dark-700 px-3 py-1 text-slate-300">Triple (3 col)</button>
        </div>
      )}

      <div className="space-y-4">
        {rows.map(row => (
          <div key={row.id} className="group/row relative">
            {editMode && (
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[11px] tracking-widest text-slate-600">ROW {row.id.slice(0,4)} — {row.columns.length} col</span>
                <span className="ml-auto flex gap-1">
                  <button onClick={() => moveRow(row.id, -1)} className="border border-border-dark bg-dark-900 p-1"><ChevronUp className="h-3 w-3 text-slate-400" /></button>
                  <button onClick={() => moveRow(row.id, 1)} className="border border-border-dark bg-dark-900 p-1"><ChevronDown className="h-3 w-3 text-slate-400" /></button>
                  <button onClick={() => removeRow(row.id)} className="border border-accent-red/30 bg-dark-900 p-1 text-accent-red"><Trash2 className="h-3 w-3" /></button>
                  {row.columns.length < 3 && <button onClick={() => addColumnToRow(row.id)} className="border border-border-dark bg-dark-900 px-2 py-1 text-xs text-slate-400">+ col</button>}
                </span>
              </div>
            )}
            <div className={`grid gap-4 ${row.columns.length === 1 ? "grid-cols-1" : row.columns.length === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-3"}`}>
              {row.columns.map(col => {
                const IconComp = iconMap[col.icon] ?? Cpu;
                const embed = col.mediaUrl ? toEmbedUrl(col.mediaUrl) : null;
                return (
                  <div key={col.id} className={`${!editMode ? "p-px bg-gradient-to-br from-accent-cyan/15 via-[#4338ca]/10 to-transparent" : "border border-border-dark"}`}>
                    <div className="border border-border-dark bg-dark-700 p-5 h-full">
                      {editMode ? (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <select value={col.icon} onChange={e => updateColumn(row.id, col.id, { icon: e.target.value })} className="border border-border-dark bg-dark-900 px-2 py-1 text-xs text-white">
                              {iconOptions.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                            <input value={col.iconGradient} onChange={e => updateColumn(row.id, col.id, { iconGradient: e.target.value })} placeholder="linear-gradient(135deg, #00f0ff, #4338ca)" className="flex-1 border border-border-dark bg-dark-900 px-2 py-1 text-xs text-white" />
                            <button onClick={() => removeColumn(row.id, col.id)} className="border border-border-dark px-2 text-accent-red">x</button>
                          </div>
                          <input value={col.title} onChange={e => updateColumn(row.id, col.id, { title: e.target.value })} placeholder="Title" className="w-full border border-border-dark bg-dark-900 px-2 py-1.5 text-sm text-white" />
                          <input value={col.subtitle ?? ""} onChange={e => updateColumn(row.id, col.id, { subtitle: e.target.value })} placeholder="Subtitle" className="w-full border border-border-dark bg-dark-900 px-2 py-1 text-xs text-slate-300" />
                          <textarea value={col.bio ?? ""} onChange={e => updateColumn(row.id, col.id, { bio: e.target.value })} rows={3} placeholder="Bio / markdown" className="w-full border border-border-dark bg-dark-900 px-2 py-1 text-xs text-slate-300" />
                          <input
                            value={labelsDraft[col.id] !== undefined ? labelsDraft[col.id] : (col.chips ?? []).join(", ")}
                            onChange={e => setLabelsDraft(prev => ({ ...prev, [col.id]: e.target.value }))}
                            onBlur={e => {
                              const chips = e.target.value.split(",").map(s=>s.trim()).filter(Boolean);
                              updateColumn(row.id, col.id, { chips });
                            }}
                            placeholder="Labels (e.g. TypeScript, Python, C++)"
                            className="w-full border border-border-dark bg-dark-900 px-2 py-1 text-xs text-white"
                          />
                          <input
                            value={linksDraft[col.id] !== undefined ? linksDraft[col.id] : (col.links ?? []).map(l=>`${l.label}|${l.href}`).join(", ")}
                            onChange={e => setLinksDraft(prev => ({ ...prev, [col.id]: e.target.value }))}
                            onBlur={e => {
                              const links = e.target.value.split(",").map(s=>s.trim()).filter(Boolean).map(s=>{ const [label, href] = s.split("|").map(x=>x.trim()); return { label: label ?? s, href: href ?? "#" }; });
                              updateColumn(row.id, col.id, { links });
                            }}
                            placeholder="Links label|href, comma (e.g. GitHub|https://github.com, Email|mailto:test@hexcent.io)"
                            className="w-full border border-border-dark bg-dark-900 px-2 py-1 text-xs text-white"
                          />
                          <input value={col.mediaUrl ?? ""} onChange={e => updateColumn(row.id, col.id, { mediaUrl: e.target.value })} placeholder="Media URL (image, video, YouTube)" className="w-full border border-border-dark bg-dark-900 px-2 py-1 text-xs text-white" />
                        </div>
                      ) : (
                        <>
                          <div className="flex h-8 w-8 items-center justify-center border border-border-dark" style={{ background: col.iconGradient }}>
                            <IconComp className="h-4 w-4 text-white" />
                          </div>
                          <h3 className="mt-3 text-sm font-bold text-white">{col.title}</h3>
                          {col.subtitle && <p className="mt-1 text-xs text-slate-500">{col.subtitle}</p>}
                          {col.bio && <p className="mt-2 text-xs leading-relaxed text-slate-400 whitespace-pre-wrap">{col.bio}</p>}
                          {col.chips && col.chips.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {col.chips.map(chip => <span key={chip} className="border border-border-dark bg-dark-900 px-2 py-0.5 text-[11px] text-slate-300">{chip}</span>)}
                            </div>
                          )}
                          {col.links && col.links.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {col.links.map(l => <a key={l.label} href={l.href} target="_blank" rel="noopener" className="border border-border-dark bg-dark-900 px-2 py-1 text-xs text-slate-300 hover:text-white inline-flex items-center gap-1">{l.label} <ExternalLink className="h-3 w-3" /></a>)}
                            </div>
                          )}
                          {col.mediaUrl && (
                            <div className="mt-3">
                              {(() => {
                                const embedUrl = toEmbedUrl(col.mediaUrl);
                                if (embedUrl) return <div className="w-full aspect-video min-h-[380px] max-h-[550px] border border-border-dark bg-dark-900 my-4 overflow-hidden"><iframe src={embedUrl} className="w-full h-full border-none" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={col.title} /></div>;
                                if (col.mediaUrl.match(/\.(mp4|webm)$/)) return <video src={col.mediaUrl} controls className="w-full border border-border-dark bg-dark-900" />;
                                return <img src={col.mediaUrl} alt={col.title} className="w-full max-h-[200px] object-contain border border-border-dark bg-dark-900 p-1" />;
                              })()}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
