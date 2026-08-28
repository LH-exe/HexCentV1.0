"use client";

import { useEffect, useState } from "react";
import { Shield, Database, Radio, RefreshCw, Terminal, Lock, Plus, Trash2, Edit3, Eye, EyeOff, X, Save } from "lucide-react";
import Link from "next/link";

type Stats = {
  db: { status: string; docCount: number | string };
  redis: { status: string; latency: string };
  session: { role: string };
  timestamp: string;
};

type Project = {
  id: string;
  slug: string;
  title: string;
  description: string;
  status: string;
  tags: string;
  isPublic: boolean;
  order: number;
};

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState({ slug: "", title: "", description: "", status: "In Development", tags: "", isPublic: true, order: 0 });

  const [showDb, setShowDb] = useState(false);
  const [dbTab, setDbTab] = useState<"folders" | "documents" | "cards" | "tasks" | "projects">("folders");
  const [dbFolders, setDbFolders] = useState<{ id: string; name: string; parentId: string | null; color: string | null }[]>([]);
  const [dbDocs, setDbDocs] = useState<{ id: string; title: string; folderId: string | null; icon: string | null }[]>([]);
  const [dbCards, setDbCards] = useState<{ id: string; title: string; status: string }[]>([]);
  const [dbTasks, setDbTasks] = useState<{ id: string; title: string; completed: boolean }[]>([]);
  const [dbProjects, setDbProjects] = useState<{ id: string; slug: string; title: string }[]>([]);
  const [dbLoading, setDbLoading] = useState(false);

  async function fetchDbData() {
    setDbLoading(true);
    try {
      const [foldersRes, docsRes, cardsRes, tasksRes, projectsRes] = await Promise.all([
        fetch("/api/folders", { cache: "no-store" }).then(r => r.json()).catch(() => ({ folders: [] })),
        fetch("/api/documents", { cache: "no-store" }).then(r => r.json()).catch(() => ({ documents: [] })),
        fetch("/api/workspace-cards", { cache: "no-store" }).then(r => r.json()).catch(() => ({ cards: [] })),
        fetch("/api/tasks", { cache: "no-store" }).then(r => r.json()).catch(() => ({ tasks: [] })),
        fetch("/api/projects", { cache: "no-store" }).then(r => r.json()).catch(() => ({ projects: [] })),
      ]);
      setDbFolders(foldersRes.folders ?? []);
      setDbDocs(docsRes.documents ?? []);
      setDbCards(cardsRes.cards ?? []);
      setDbTasks(tasksRes.tasks ?? []);
      setDbProjects(projectsRes.projects ?? []);
    } catch {}
    finally { setDbLoading(false); }
  }

  async function handleDbDelete(type: string, id: string) {
    if (!confirm(`Delete ${type} ${id}? This cannot be undone.`)) return;
    let url = "";
    if (type === "folders") url = `/api/folders/${id}`;
    else if (type === "documents") url = `/api/documents/${id}`;
    else if (type === "cards") url = `/api/workspace-cards/${id}`;
    else if (type === "tasks") url = `/api/tasks/${id}`;
    else if (type === "projects") url = `/api/projects/${id}`;
    else if (type === "adminProjects") url = `/api/admin/projects/${id}`;
    const res = await fetch(url, { method: "DELETE" });
    if (!res.ok) { alert("Delete failed"); return; }
    if (type === "folders") setDbFolders(p => p.filter(x => x.id !== id));
    else if (type === "documents") setDbDocs(p => p.filter(x => x.id !== id));
    else if (type === "cards") setDbCards(p => p.filter(x => x.id !== id));
    else if (type === "tasks") setDbTasks(p => p.filter(x => x.id !== id));
    else if (type === "projects") setDbProjects(p => p.filter(x => x.id !== id));
  }

  async function fetchStats() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/stats", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch stats");
      setStats(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function fetchProjects() {
    setLoadingProjects(true);
    try {
      const res = await fetch("/api/admin/projects", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setProjects(data.projects ?? []);
    } catch {}
    finally { setLoadingProjects(false); }
  }

  useEffect(() => {
    fetchStats();
    fetchProjects();
  }, []);

  async function handleCreate() {
    if (!form.slug || !form.title) { alert("slug and title required"); return; }
    const tagsJson = JSON.stringify(form.tags.split(",").map(s => s.trim()).filter(Boolean));
    const res = await fetch("/api/admin/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, tags: tagsJson }) });
    const data = await res.json();
    if (!res.ok) { alert(data.error ?? "Create failed"); return; }
    setProjects(p => [...p, data.project]);
    setForm({ slug: "", title: "", description: "", status: "In Development", tags: "", isPublic: true, order: 0 });
    setShowNew(false);
  }

  async function handleUpdate() {
    if (!editing) return;
    const tagsJson = editing.tags.startsWith("[") ? editing.tags : JSON.stringify(editing.tags.split(",").map(s => s.trim()).filter(Boolean));
    const res = await fetch(`/api/admin/projects/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...editing, tags: tagsJson }) });
    const data = await res.json();
    if (!res.ok) { alert(data.error ?? "Update failed"); return; }
    setProjects(p => p.map(x => x.id === editing.id ? data.project : x));
    setEditing(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete project?")) return;
    const res = await fetch(`/api/admin/projects/${id}`, { method: "DELETE" });
    if (!res.ok) { alert("Delete failed"); return; }
    setProjects(p => p.filter(x => x.id !== id));
  }

  async function togglePublic(proj: Project) {
    const res = await fetch(`/api/admin/projects/${proj.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isPublic: !proj.isPublic }) });
    const data = await res.json();
    if (res.ok) setProjects(p => p.map(x => x.id === proj.id ? data.project : x));
  }

  if (error && error.toLowerCase().includes("unauthorized")) {
    return (
      <div className="max-w-2xl mx-auto font-mono page-fade-in">
        <div className="border border-border-dark bg-dark-700 p-8 text-center">
          <Lock className="h-6 w-6 text-slate-500 mx-auto" />
          <h2 className="mt-3 text-sm font-bold tracking-widest text-white">ADMIN ONLY</h2>
          <p className="mt-2 text-xs text-slate-500">Admin session required. Sign in with admin password.</p>
          <Link href="/login?next=/admin" className="mt-4 inline-flex border border-border-dark bg-dark-900 px-4 py-2 text-xs tracking-widest text-slate-300 hover:text-white">GO TO LOGIN</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-mono page-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border-dark pb-4">
        <div>
          <h1 className="text-sm font-bold tracking-[0.12em] text-white flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center icon-grad-shield border border-border-dark"><Shield className="h-4 w-4 text-white" /></span> ADMIN
          </h1>
          <p className="mt-1 text-xs text-slate-500">System diagnostics and project management</p>
        </div>
        <button onClick={fetchStats} disabled={loading} className="inline-flex items-center gap-1.5 border border-border-dark bg-dark-700 px-3.5 py-2 text-xs tracking-widest text-slate-300 hover:text-white disabled:opacity-50">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> REFRESH
        </button>
      </div>

      {error && !stats && (
        <div className="border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-300">
          {error}
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        <div onClick={() => { setShowDb(v => !v); if (!showDb) fetchDbData(); }} title="Click to browse & edit database" className="border border-border-dark bg-dark-700 p-4 cursor-pointer hover:border-accent-cyan/40 hover:bg-dark-900/30 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] tracking-[0.12em] text-slate-500 flex items-center gap-1.5"><Database className="h-3.5 w-3.5" /> SQLITE {showDb ? "▲" : "▼"}</span>
            <span className={`h-2 w-2 ${stats?.db.status === "connected" ? "bg-accent-green" : stats?.db.status === "disconnected" ? "bg-accent-red" : "bg-slate-600"}`} />
          </div>
          <p className={`mt-3 text-sm font-bold ${stats?.db.status === "connected" ? "text-white" : "text-slate-500"}`}>{loading ? "—" : (stats?.db.status === "connected" ? "Local dev.db Active" : (stats?.db.status ?? "unknown").toUpperCase())}</p>
          <p className="mt-1 text-xs text-slate-500">Documents: {String((stats?.db as unknown as { docCount?: unknown })?.docCount ?? "—")} • Projects: {String((stats?.db as unknown as { projectCount?: unknown })?.projectCount ?? "—")}</p>
          <p className="mt-2 text-[11px] tracking-widest text-accent-cyan/70">Click to {showDb ? "hide" : "view & edit"} tables →</p>
        </div>
        <div className="border border-border-dark bg-dark-700 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] tracking-[0.12em] text-slate-500 flex items-center gap-1.5"><Radio className="h-3.5 w-3.5" /> REDIS</span>
            <span className={`h-2 w-2 ${stats?.redis.status === "connected" ? "bg-accent-green" : "bg-slate-600"}`} />
          </div>
          <p className="mt-3 text-sm font-bold text-white">{loading ? "—" : (stats?.redis.status ?? "unknown").toUpperCase()}</p>
          <p className="mt-1 text-xs text-slate-500">Latency: {stats?.redis.latency ?? "—"} • Rate-Limit cache</p>
        </div>
        <div className="border border-border-dark bg-dark-700 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] tracking-[0.12em] text-slate-500 flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> SESSION</span>
            <span className="h-2 w-2 bg-accent-green" />
          </div>
          <p className="mt-3 text-sm font-bold text-white">{stats?.session.role ?? "—"}</p>
          <p className="mt-1 text-xs text-slate-500">ADMIN — full access</p>
        </div>
      </div>

      {showDb && (
        <div className="border border-border-dark bg-dark-700 overflow-hidden">
          <div className="flex flex-wrap gap-1 border-b border-border-dark bg-dark-900 px-3 py-2">
            {([
              ["folders", `Folders (${dbFolders.length})`],
              ["documents", `Documents (${dbDocs.length})`],
              ["cards", `WorkspaceCards (${dbCards.length})`],
              ["tasks", `Tasks (${dbTasks.length})`],
              ["projects", `Projects (${dbProjects.length})`],
            ] as const).map(([key, label]) => (
              <button key={key} onClick={() => setDbTab(key)} className={`px-3 py-1.5 text-xs tracking-widest border ${dbTab === key ? "bg-white text-dark-900 border-white" : "bg-dark-700 text-slate-400 border-border-dark hover:text-white"}`}>{label}</button>
            ))}
            <button onClick={fetchDbData} className="ml-auto border border-border-dark bg-dark-700 px-3 py-1.5 text-xs text-slate-300 hover:text-white flex items-center gap-1"><RefreshCw className={`h-3 w-3 ${dbLoading ? "animate-spin" : ""}`} /> REFRESH</button>
          </div>
          <div className="max-h-[420px] overflow-y-auto p-3 space-y-2" style={{ scrollbarWidth: "thin" }}>
            {dbLoading ? <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2"><RefreshCw className="h-4 w-4 animate-spin" /> Loading tables...</div> : (
              <>
                {dbTab === "folders" && (
                  dbFolders.length === 0 ? <p className="text-xs text-slate-600 py-4 text-center">No folders</p> :
                  <div className="space-y-1">
                    {dbFolders.map(f => (
                      <div key={f.id} className="flex items-center gap-2 border border-border-dark bg-dark-900 px-3 py-2 text-xs">
                        <span className="h-2.5 w-2.5 border border-border-dark shrink-0" style={{ background: f.color ?? "#00f0ff" }} />
                        <span className="flex-1 truncate text-white">{f.name}</span>
                        <span className="text-[11px] text-slate-600 hidden sm:inline truncate max-w-[180px]">{f.id}</span>
                        <span className="text-[11px] text-slate-500">parent: {f.parentId ?? "root"}</span>
                        <button onClick={() => handleDbDelete("folders", f.id)} className="ml-2 border border-accent-red/20 bg-dark-700 p-1 text-accent-red hover:bg-accent-red/10"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
                {dbTab === "documents" && (
                  dbDocs.length === 0 ? <p className="text-xs text-slate-600 py-4 text-center">No documents</p> :
                  <div className="space-y-1">
                    {dbDocs.map(d => (
                      <div key={d.id} className="flex items-center gap-2 border border-border-dark bg-dark-900 px-3 py-2 text-xs">
                        <span className="text-sm">{d.icon ?? "📄"}</span>
                        <span className="flex-1 truncate text-white">{d.title || "Untitled"}</span>
                        <span className="text-[11px] text-slate-600 hidden sm:inline truncate max-w-[150px]">{d.id}</span>
                        <span className="text-[11px] text-slate-500">folder: {d.folderId ?? "unassigned"}</span>
                        <button onClick={() => handleDbDelete("documents", d.id)} className="ml-2 border border-accent-red/20 bg-dark-700 p-1 text-accent-red hover:bg-accent-red/10"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
                {dbTab === "cards" && (
                  dbCards.length === 0 ? <p className="text-xs text-slate-600 py-4 text-center">No workspace cards</p> :
                  <div className="space-y-1">
                    {dbCards.map(c => (
                      <div key={c.id} className="flex items-center gap-2 border border-border-dark bg-dark-900 px-3 py-2 text-xs">
                        <span className="flex-1 truncate text-white">{c.title}</span>
                        <span className="text-[11px] text-slate-500">{c.status}</span>
                        <button onClick={() => handleDbDelete("cards", c.id)} className="ml-2 border border-accent-red/20 bg-dark-700 p-1 text-accent-red hover:bg-accent-red/10"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
                {dbTab === "tasks" && (
                  dbTasks.length === 0 ? <p className="text-xs text-slate-600 py-4 text-center">No tasks</p> :
                  <div className="space-y-1">
                    {dbTasks.map(t => (
                      <div key={t.id} className="flex items-center gap-2 border border-border-dark bg-dark-900 px-3 py-2 text-xs">
                        <span className="flex-1 truncate text-slate-300">{t.title}</span>
                        <span className={`text-[11px] ${t.completed ? "text-emerald-400" : "text-slate-500"}`}>{t.completed ? "done" : "open"}</span>
                        <button onClick={() => handleDbDelete("tasks", t.id)} className="ml-2 border border-accent-red/20 bg-dark-700 p-1 text-accent-red hover:bg-accent-red/10"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
                {dbTab === "projects" && (
                  dbProjects.length === 0 ? <p className="text-xs text-slate-600 py-4 text-center">No projects</p> :
                  <div className="space-y-1">
                    {dbProjects.map(p => (
                      <div key={p.id} className="flex items-center gap-2 border border-border-dark bg-dark-900 px-3 py-2 text-xs">
                        <span className="flex-1 truncate text-white">{p.title}</span>
                        <span className="text-[11px] text-slate-500 hidden sm:inline">{p.slug}</span>
                        <button onClick={() => handleDbDelete("projects", p.id)} className="ml-2 border border-accent-red/20 bg-dark-700 p-1 text-accent-red hover:bg-accent-red/10"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="border-t border-border-dark bg-dark-900 px-3 py-2 text-[11px] text-slate-600">
            Direct SQLite access — deletions are immediate. Use refresh after workspace changes. Orphaned folders (parentId not in list) are visible here for cleanup.
          </div>
        </div>
      )}

      <div className="border border-border-dark bg-dark-900 p-3 flex items-start gap-2 text-[11px] leading-relaxed text-slate-500">
        <Terminal className="h-4 w-4 text-slate-600 mt-0.5 shrink-0" />
        <span>Diagnostics: GET /api/admin/stats. Rate buckets: login 5/m • api 60/m • docwrite 20/m. {stats?.timestamp ? new Date(stats.timestamp).toLocaleString() : ""}</span>
      </div>

      {/* Project Manager */}
      <div className="border border-border-dark bg-dark-700">
        <div className="flex items-center justify-between border-b border-border-dark px-4 py-3">
          <h2 className="text-xs font-bold tracking-[0.12em] text-white">PROJECTS</h2>
          <button onClick={() => setShowNew(v => !v)} className="border border-border-dark bg-white px-3 py-1.5 text-xs font-bold tracking-widest text-dark-900 hover:bg-slate-100 flex items-center gap-1.5">
            {showNew ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />} {showNew ? "CANCEL" : "NEW PROJECT"}
          </button>
        </div>

        {showNew && (
          <div className="border-b border-border-dark bg-dark-900 p-3 flex flex-wrap gap-2 items-center text-xs">
            <input placeholder="ID" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} className="flex-1 min-w-[140px] border border-border-dark bg-dark-700 px-3 py-2 text-white placeholder:text-slate-600" />
            <input placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="flex-1 min-w-[180px] border border-border-dark bg-dark-700 px-3 py-2 text-white" />
            <button onClick={handleCreate} className="border border-white bg-white px-4 py-2 font-bold tracking-widest text-dark-900 hover:bg-slate-100 flex items-center gap-1"><Plus className="h-3 w-3" /> ADD</button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b border-border-dark bg-dark-900 text-[11px] tracking-widest text-slate-500">
              <tr>
                <th className="text-left px-3 py-2">ID</th>
                <th className="text-left px-3 py-2">TITLE</th>
                <th className="text-left px-3 py-2 hidden sm:table-cell">STATUS</th>
                <th className="text-left px-3 py-2">PUBLIC</th>
                <th className="text-right px-3 py-2">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loadingProjects ? (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">Loading...</td></tr>
              ) : projects.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">No projects — create one.</td></tr>
              ) : projects.map(p => (
                <tr key={p.id} className="border-b border-border-dark/50 hover:bg-dark-900/50">
                  <td className="px-3 py-2 text-slate-400">{p.slug}</td>
                  <td className="px-3 py-2 text-white">{p.title}</td>
                  <td className="px-3 py-2 hidden sm:table-cell text-slate-500">{p.status}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => togglePublic(p)} className={`border px-2 py-1 text-[11px] tracking-widest ${p.isPublic ? "border-accent-green/30 bg-accent-green/10 text-accent-green" : "border-border-dark bg-dark-900 text-slate-500"}`}>
                      {p.isPublic ? <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> YES</span> : <span className="flex items-center gap-1"><EyeOff className="h-3 w-3" /> NO</span>}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-right flex justify-end gap-1">
                    <button onClick={() => setEditing(p)} className="border border-border-dark bg-dark-900 p-1.5 text-slate-400 hover:text-white"><Edit3 className="h-3 w-3" /></button>
                    <button onClick={() => handleDelete(p.id)} className="border border-accent-red/20 bg-dark-900 p-1.5 text-accent-red hover:bg-accent-red/10"><Trash2 className="h-3 w-3" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {editing && (
          <div className="border-t border-border-dark bg-dark-900 p-4">
            <h3 className="text-xs font-bold tracking-widest text-white mb-3">EDIT - {editing.slug}</h3>
            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              <input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} placeholder="Title" className="border border-border-dark bg-dark-700 px-2 py-2 text-white" />
              <input value={editing.slug} onChange={e => setEditing({ ...editing, slug: e.target.value })} placeholder="ID" className="border border-border-dark bg-dark-700 px-2 py-2 text-white" />
              <input value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} placeholder="Description" className="sm:col-span-2 border border-border-dark bg-dark-700 px-2 py-2 text-white" />
              <input value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value })} placeholder="Status" className="border border-border-dark bg-dark-700 px-2 py-2 text-white" />
              <input value={editing.tags} onChange={e => setEditing({ ...editing, tags: e.target.value })} placeholder='Tags JSON or comma' className="border border-border-dark bg-dark-700 px-2 py-2 text-white" />
              <label className="flex items-center gap-2 text-slate-400"><input type="checkbox" checked={editing.isPublic} onChange={e => setEditing({ ...editing, isPublic: e.target.checked })} /> Public</label>
              <div className="flex gap-2">
                <button onClick={handleUpdate} className="border border-accent-cyan/30 bg-accent-cyan px-3 py-2 font-bold tracking-widest text-dark-900 flex items-center gap-1"><Save className="h-3 w-3" /> SAVE</button>
                <button onClick={() => setEditing(null)} className="border border-border-dark bg-dark-700 px-3 py-2 text-slate-300">CANCEL</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
