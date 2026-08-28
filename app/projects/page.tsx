"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Folder, Plus, Eye, EyeOff, Edit3, X, Save, Trash2, Cpu, Activity, Shield, Terminal, Database, Zap, Code, LineChart, FileText, Layers, Lock, type LucideIcon } from "lucide-react";

type Project = { id: string; slug: string; title: string; description: string; icon: string; iconColor: string; titleColor: string; summaryColor: string; status: string; tags: string; content: string; isPublic: boolean; order: number };

const iconMap: Record<string, LucideIcon> = { Cpu, Activity, Shield, Terminal, Database, Zap, Code, Folder, LineChart, FileText, Layers, Lock };
const iconOptions = ["Cpu","Activity","Shield","Terminal","Database","Zap","Code","Folder","LineChart","FileText","Layers","Lock"];

function parseTags(tags: string): string[] { try { const arr = JSON.parse(tags); if (Array.isArray(arr)) return arr; } catch {} return []; }

function statusBadgeClass(status: string): string {
  if (status === "Active") return "bg-emerald-950/60 text-emerald-400 border border-emerald-800";
  if (status === "Archived") return "bg-orange-950/60 text-orange-400 border border-orange-800";
  if (status === "Concept") return "bg-yellow-950/60 text-yellow-400 border border-yellow-800";
  if (status === "In Development") return "bg-cyan-950/60 text-cyan-400 border border-cyan-800";
  return "border border-border-dark text-slate-500 bg-dark-900";
}

function RenderIcon({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) {
  const IconComponent = iconMap[name] || FileText;
  return <IconComponent className={className ?? "w-5 h-5"} style={style} />;
}

export default function ProjectsIndex() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Project & { dualColors: string }>>({});

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" }).then(r=>r.json()).then(d=> { if(d.role==="ADMIN") setIsAdmin(true); }).catch(()=>{});
    fetch("/api/projects", { cache: "no-store" }).then(r=>r.json()).then(d=> setProjects(d.projects ?? [])).finally(()=> setLoading(false));
  }, []);

  async function handleNewProject() {
    const slug = `project-${Date.now()}`;
    const res = await fetch("/api/projects", { method: "POST", headers: { "Content-Type":"application/json"}, body: JSON.stringify({ slug, title: "Untitled Project", description: "Project summary...", icon: "Folder", iconColor: "linear-gradient(135deg, #00f0ff, #4338ca)", titleColor: "#ffffff", summaryColor: "#94a3b8", status: "Concept", tags: JSON.stringify([]), content: "[]", isPublic: true }) });
    const data = await res.json();
    if (res.ok && data.project) {
      setProjects(p=> [...p, data.project]);
      // non-intrusive: do not redirect
    }
  }

  async function handleDelete(p: Project) {
    if (!confirm(`Delete "${p.title}"?`)) return;
    const res = await fetch(`/api/projects/${p.id}`, { method: "DELETE" });
    if (res.ok) setProjects(prev=> prev.filter(x=> x.id !== p.id));
  }

  async function startEdit(p: Project) {
    setEditingId(p.id);
    setEditForm({ ...p, dualColors: `${p.titleColor}, ${p.summaryColor}` });
  }
  async function saveEdit() {
    if (!editingId || !editForm) return;
    const payload: Record<string, unknown> = {};
    if (editForm.title !== undefined) payload.title = editForm.title;
    if (editForm.icon !== undefined) payload.icon = editForm.icon;
    if (editForm.iconColor !== undefined) payload.iconColor = editForm.iconColor;
    if ((editForm as { dualColors?: string }).dualColors !== undefined) {
      const parts = ((editForm as { dualColors?: string }).dualColors ?? "").split(",").map(s=>s.trim()).filter(Boolean);
      if (parts[0]) payload.titleColor = parts[0];
      if (parts[1]) payload.summaryColor = parts[1];
    }
    if (editForm.tags !== undefined) {
      const t = editForm.tags as string;
      payload.tags = t.trim().startsWith("[") ? t : JSON.stringify(t.split(",").map(s=>s.trim()).filter(Boolean));
    }
    if (editForm.isPublic !== undefined) payload.isPublic = editForm.isPublic;
    const res = await fetch(`/api/projects/${editingId}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload) });
    const data = await res.json();
    if (res.ok) { setProjects(prev=> prev.map(x=> x.id===editingId ? data.project : x)); setEditingId(null); }
  }

  async function toggleVisible(p: Project) {
    const res = await fetch(`/api/projects/${p.id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ isPublic: !p.isPublic }) });
    const data = await res.json();
    if (res.ok) setProjects(prev=> prev.map(x=> x.id===p.id ? data.project : x));
  }

  return (
    <div className="space-y-6 font-mono page-fade-in">
      <div className="border-b border-border-dark pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white">PROJECTS</h1>
        </div>
        <span className="text-xs text-slate-600">{loading ? "" : `${projects.length} projects`}</span>
      </div>

      {loading ? (
        <div className="border border-border-dark bg-dark-700 p-6 text-xs text-slate-500">Loading...</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => {
            const tags = parseTags(p.tags);
            const isEditing = editingId === p.id;
            const IconComp = iconMap[p.icon] ?? Folder;
            return (
              <div key={p.id} className="group relative border border-border-dark bg-dark-700 flex flex-col">
                {isAdmin && (
                  <div className="absolute top-2 right-2 flex gap-1 z-10">
                    {isEditing ? (
                      <>
                        <button onClick={saveEdit} className="border border-accent-cyan/30 bg-accent-cyan p-1 text-dark-900"><Save className="h-3 w-3" /></button>
                        <button onClick={()=> setEditingId(null)} className="border border-border-dark bg-dark-900 p-1 text-slate-400"><X className="h-3 w-3" /></button>
                      </>
                    ) : (
                      <>
                        <button onClick={()=> startEdit(p)} className="border border-border-dark bg-dark-900 p-1 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100"><Edit3 className="h-3 w-3" /></button>
                        <button onClick={()=> toggleVisible(p)} className={`border p-1 ${p.isPublic ? "border-accent-green/20 text-accent-green" : "border-border-dark text-slate-500"}`}>{p.isPublic ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}</button>
                        <button onClick={()=> handleDelete(p)} className="border border-accent-red/20 bg-dark-900 p-1 text-accent-red hover:bg-accent-red/10"><Trash2 className="h-3 w-3" /></button>
                      </>
                    )}
                  </div>
                )}

                {isEditing ? (
                  <div className="p-4 space-y-2">
                    <input value={editForm.title as string ?? ""} onChange={e=> setEditForm({...editForm, title: e.target.value})} placeholder="Title" className="w-full border border-border-dark bg-dark-900 px-2 py-1.5 text-sm text-white" />
                    <div className="grid grid-cols-2 gap-2">
                      <select value={editForm.icon as string ?? p.icon} onChange={e=> setEditForm({...editForm, icon: e.target.value})} className="border border-border-dark bg-dark-900 px-2 py-1 text-xs text-white">
                        {iconOptions.map(o=> <option key={o} value={o}>{o}</option>)}
                      </select>
                      <input value={editForm.iconColor as string ?? ""} onChange={e=> setEditForm({...editForm, iconColor: e.target.value})} placeholder="Gradient" className="border border-border-dark bg-dark-900 px-2 py-1 text-xs text-white" />
                    </div>
                    <input value={(editForm as { dualColors?: string }).dualColors ?? ""} onChange={e=> setEditForm({...editForm, dualColors: e.target.value})} placeholder="#ffffff, #94a3b8" className="w-full border border-border-dark bg-dark-900 px-2 py-1 text-xs text-white" />
                    <input value={Array.isArray(parseTags(editForm.tags as string ?? p.tags)) ? parseTags(editForm.tags as string ?? p.tags).join(", ") : editForm.tags as string} onChange={e=> setEditForm({...editForm, tags: e.target.value})} placeholder="Tags comma separated (unlimited)" className="w-full border border-border-dark bg-dark-900 px-2 py-1 text-xs text-white" />
                  </div>
                ) : (
                  <Link href={`/projects/${p.slug}`} className="flex-1 p-5 flex flex-col">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center border border-border-dark shrink-0" style={{ background: p.iconColor }}>
                        <IconComp className="h-4 w-4 text-white" />
                      </div>
                      <span className={`px-2 py-0.5 text-[11px] tracking-widest ${statusBadgeClass(p.status)}`}>{p.status}</span>
                    </div>
                    <h2 className="mt-3 text-sm font-bold" style={{ color: p.titleColor }}>{p.title}</h2>
                    <p className="mt-1 text-xs leading-relaxed line-clamp-3" style={{ color: p.summaryColor }}>{p.description}</p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {tags.map(t=> <span key={t} className="border border-border-dark bg-dark-900 px-1.5 py-0.5 text-[11px] text-slate-500">{t}</span>)}
                    </div>
                    {!p.isPublic && <span className="mt-2 text-[11px] text-amber-400">Hidden</span>}
                  </Link>
                )}
              </div>
            );
          })}

          {isAdmin && (
            <button onClick={handleNewProject} className="border border-dashed border-border-dark bg-dark-700/50 p-6 flex flex-col items-center justify-center gap-3 hover:border-border-light hover:bg-dark-700 min-h-[180px]">
              <span className="flex h-8 w-8 items-center justify-center border border-border-dark bg-dark-900"><Plus className="h-4 w-4 text-slate-400" /></span>
              <span className="text-xs font-bold tracking-widest text-slate-400">+ NEW PROJECT</span>
              <span className="text-[11px] text-slate-600">Create blank canvas</span>
            </button>
          )}

          {projects.length===0 && !isAdmin && <div className="border border-border-dark bg-dark-700 p-6 text-xs text-slate-500">No public projects yet.</div>}
        </div>
      )}
    </div>
  );
}
