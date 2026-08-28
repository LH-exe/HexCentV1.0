"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDebouncedSave } from "@/lib/hooks/useDebouncedSave";
import { ArrowLeft, Plus, Trash2, Copy, Check, LayoutGrid, Loader2, Cpu, Activity, Shield, Terminal, Database, Zap, Code, Folder, LineChart, FileText, Layers, Lock, type LucideIcon } from "lucide-react";
import Link from "next/link";

const ICON_MAP: Record<string, LucideIcon> = {
  Cpu, Activity, Shield, Terminal, Database, Zap, Code,
  Folder, LineChart, FileText, Layers, Lock
};

function RenderIcon({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) {
  const IconComp = ICON_MAP[name] || FileText;
  return <IconComp className={className ?? "w-5 h-5"} style={style} />;
}

type Block =
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "heading1"; text: string }
  | { id: string; type: "heading2"; text: string }
  | { id: string; type: "heading3"; text: string }
  | { id: string; type: "bullet"; text: string }
  | { id: string; type: "numbered"; text: string; index?: number }
  | { id: string; type: "todo"; text: string; checked: boolean }
  | { id: string; type: "code"; text: string; lang?: string }
  | { id: string; type: "image"; url: string; caption?: string };

type Project = { id: string; slug: string; title: string; description: string; icon: string; iconColor: string; titleColor: string; summaryColor: string; status: string; tags: string; content: string; isPublic: boolean };

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

function parseContent(rawContent: string | null | undefined | any): Block[] {
  const empty: Block = { id: "1", type: "paragraph", text: "" };
  if (!rawContent) return [empty];
  if (Array.isArray(rawContent)) {
    return rawContent.length > 0
      ? (rawContent as any[]).map((b: any) => ({
          id: b?.id ?? Math.random().toString(36).slice(2, 8),
          type: b?.type ?? "paragraph",
          text: b?.text ?? b?.content ?? "",
          checked: b?.checked,
          url: b?.url,
          caption: b?.caption,
        })) as Block[]
      : [empty];
  }
  if (typeof rawContent === "string") {
    try {
      const parsed = JSON.parse(rawContent);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return (parsed as any[]).map((b: any) => ({
          id: b?.id ?? Math.random().toString(36).slice(2, 8),
          type: b?.type ?? "paragraph",
          text: b?.text ?? b?.content ?? "",
          checked: b?.checked,
          url: b?.url ?? b?.text,
          caption: b?.caption,
        })) as Block[];
      }
      if (typeof parsed === "string") {
        return [{ id: "1", type: "paragraph", text: parsed }];
      }
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const obj = parsed as any;
        return [
          {
            id: obj?.id ?? "1",
            type: obj?.type ?? "paragraph",
            text: obj?.text ?? obj?.content ?? "",
            checked: obj?.checked,
            url: obj?.url,
            caption: obj?.caption,
          } as Block,
        ];
      }
    } catch {
      if (rawContent === "[]") return [empty];
      return [{ id: "1", type: "paragraph", text: rawContent }];
    }
    if (rawContent === "[]") return [empty];
    return [{ id: "1", type: "paragraph", text: rawContent }];
  }
  if (typeof rawContent === "object") {
    const obj = rawContent as any;
    if (obj && (obj.text !== undefined || obj.content !== undefined || obj.type !== undefined)) {
      return [
        {
          id: obj?.id ?? "1",
          type: obj?.type ?? "paragraph",
          text: obj?.text ?? obj?.content ?? "",
          checked: obj?.checked,
          url: obj?.url,
          caption: obj?.caption,
        } as Block,
      ];
    }
    return [empty];
  }
  return [empty];
}

export default function ProjectPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("In Development");
  const [tagsStr, setTagsStr] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [draggedBlock, setDraggedBlock] = useState<string | null>(null);

  // Fast metadata status (optimistic, 300ms micro-debounce)
  const [metaStatus, setMetaStatus] = useState<"idle" | "syncing" | "saved" | "error">("idle");
  const metaTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" }).then(r=>r.json()).then(d=> { if(d.role==="ADMIN") setIsAdmin(true); }).catch(()=>{});
  }, []);

  // Fast save for metadata (Status, Icon, Colors, Description, Tags, Title) — decoupled from heavy block debounce
  const saveMetadataImmediate = useCallback(
    async (patchPayload: Partial<Project>) => {
      if (!project?.id && !slug) return;
      const targetId = project?.id || slug;

      // Optimistic UI update
      setProject((prev) => (prev ? { ...prev, ...patchPayload } : prev));
      // Keep local states in sync for controlled inputs
      if (patchPayload.status !== undefined) setStatus(String(patchPayload.status));
      if (patchPayload.title !== undefined) setTitle(String(patchPayload.title));
      if (patchPayload.description !== undefined) setDescription(String(patchPayload.description));
      if (patchPayload.tags !== undefined) {
        try {
          const arr = JSON.parse(String(patchPayload.tags));
          if (Array.isArray(arr)) setTagsStr(arr.join(", "));
        } catch {}
      }

      setMetaStatus("syncing");
      try {
        const res = await fetch(`/api/projects/${targetId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patchPayload),
        });
        if (!res.ok) throw new Error("Failed to save metadata");
        const data = await res.json().catch(()=> ({}));
        if (data.project) setProject(data.project);
        else if (data.ok && data.project) setProject(data.project);
        setMetaStatus("saved");
        setTimeout(() => {
          setMetaStatus((prev) => (prev === "saved" ? "idle" : prev));
        }, 2000);
      } catch (err) {
        console.error("[saveMetadataImmediate] Failed:", err);
        setMetaStatus("error");
      }
    },
    [project?.id, slug]
  );

  // 300ms micro-debounce wrapper for text fields (title, description) to avoid per-keystroke flood
  const debouncedMetaSave = useCallback(
    (patch: Partial<Project>) => {
      if (metaTimeoutRef.current) clearTimeout(metaTimeoutRef.current);
      metaTimeoutRef.current = setTimeout(() => {
        saveMetadataImmediate(patch);
      }, 300);
    },
    [saveMetadataImmediate]
  );

  // Heavy content save — debounced 1500ms, only blocks (decoupled)
  const saveBlocks = useCallback(
    async (updatedBlocks: Block[]) => {
      if (!project?.id && !slug) return;
      const targetId = project?.id || slug;
      const res = await fetch(`/api/projects/${targetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: JSON.stringify(updatedBlocks) }),
      });
      if (!res.ok) throw new Error("Failed to save project content");
    },
    [project?.id, slug]
  );

  const { status: contentSaveStatus, resetBaseline: resetContentBaseline } = useDebouncedSave(blocks, saveBlocks, 1500, !!project && isAdmin);

  // Combined display status: metadata fast + content heavy
  const saveStatus: "idle" | "syncing" | "saved" | "error" =
    metaStatus === "syncing" || contentSaveStatus === "syncing"
      ? "syncing"
      : metaStatus === "error" || contentSaveStatus === "error"
        ? "error"
        : metaStatus === "saved" || contentSaveStatus === "saved"
          ? "saved"
          : "idle";

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      try {
        // try fetch by id/slug via projects list fallback (cached edge, cheap)
        const res = await fetch("/api/projects", { cache: "no-store" });
        const data = await res.json();
        const found = (data.projects ?? []).find((p: Project) => p.slug === slug || p.id === slug);
        if (found) {
          if (!isMounted) return;
          setProject(found);
          setTitle(found.title);
          setDescription(found.description ?? "");
          setStatus(found.status);
          try { const t = JSON.parse(found.tags); setTagsStr(Array.isArray(t) ? t.join(", ") : ""); } catch { setTagsStr(""); }
          const parsed = parseContent(found.content);
          setBlocks(parsed);
          resetContentBaseline(parsed);
          setMetaStatus("idle");
        } else {
          const r2 = await fetch(`/api/projects/${slug}`, { cache: "no-store" });
          if (r2.ok) {
            const d2 = await r2.json();
            if (d2.project && isMounted) {
              setProject(d2.project);
              setTitle(d2.project.title);
              setDescription(d2.project.description ?? "");
              setStatus(d2.project.status);
              const parsed = parseContent(d2.project.content);
              setBlocks(parsed);
              try { const t = JSON.parse(d2.project.tags); setTagsStr(Array.isArray(t) ? t.join(", ") : ""); } catch { setTagsStr(""); }
              resetContentBaseline(parsed);
              setMetaStatus("idle");
            }
          }
        }
      } catch (e) {
        console.error("[ProjectPage] load failed:", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, [slug, resetContentBaseline]);

  function updateBlock(id: string, patch: Partial<Block>) { setBlocks(prev=> prev.map(b=> b.id===id ? { ...b, ...patch } as Block : b)); }
  function addBlock(type: Block["type"] = "paragraph") {
    const base: Block = type==="heading1" ? { id: Date.now().toString(36), type:"heading1", text:""} 
      : type==="heading2" ? { id: Date.now().toString(36), type:"heading2", text:""}
      : type==="heading3" ? { id: Date.now().toString(36), type:"heading3", text:""}
      : type==="bullet" ? { id: Date.now().toString(36), type:"bullet", text:""}
      : type==="numbered" ? { id: Date.now().toString(36), type:"numbered", text:""}
      : type==="todo" ? { id: Date.now().toString(36), type:"todo", text:"", checked:false}
      : type==="code" ? { id: Date.now().toString(36), type:"code", text:""}
      : type==="image" ? { id: Date.now().toString(36), type:"image", url:""} as Block
      : { id: Date.now().toString(36), type:"paragraph", text:""};
    setBlocks(p=> [...p, base]);
  }
  function removeBlock(id: string) { setBlocks(p=> p.filter(b=> b.id!==id)); }

  if (loading) return <div className="border border-border-dark bg-dark-700 p-6 text-xs text-slate-500 page-fade-in">Loading project...</div>;
  if (!project) return <div className="border border-border-dark bg-dark-700 p-6 text-xs text-slate-500 page-fade-in">Project not found. <Link href="/projects" className="underline">Back to projects</Link></div>;

  const isReadOnly = !isAdmin;

  return (
    <div className="max-w-[900px] mx-auto space-y-6 font-mono page-fade-in">
      <div className="flex items-center justify-between">
        <Link href="/projects" className="inline-flex items-center gap-1 text-xs tracking-widest text-slate-400 hover:text-white"><ArrowLeft className="h-3 w-3" /> BACK</Link>
        {isAdmin && (
          <span className="flex items-center gap-1.5 text-[11px] tracking-widest">
            {saveStatus==="syncing" && <span className="flex items-center gap-1 text-slate-400"><Loader2 className="h-3 w-3 animate-spin" /> Saving...</span>}
            {saveStatus==="saved" && <span className="flex items-center gap-1 text-slate-500"><Check className="h-3 w-3" /> Saved</span>}
            {saveStatus==="idle" && <span className="text-slate-600">Idle</span>}
            {saveStatus==="error" && <span className="flex items-center gap-1 text-accent-red">Error</span>}
          </span>
        )}
      </div>

      <div className="h-24 border border-border-dark" style={{ background: project.iconColor }} />

      <div className="border border-border-dark bg-dark-700 p-6">
        <div className="flex items-start gap-4">
          {(() => { const DynamicIcon = ICON_MAP[project.icon] || FileText; return <div className="flex h-12 w-12 items-center justify-center border border-border-dark shrink-0" style={{ background: project.iconColor }}><DynamicIcon className="w-6 h-6 text-white" /></div>; })()}
          <div className="flex-1">
            {isReadOnly ? (
              <h1 className="text-xl font-bold" style={{ color: (project as unknown as { titleColor: string }).titleColor ?? "#ffffff" }}>{project.title}</h1>
            ) : (
              <input
                value={title}
                onChange={e=> setTitle(e.target.value)}
                onBlur={e=> saveMetadataImmediate({ title: e.target.value })}
                className="w-full bg-transparent text-xl font-bold text-white focus:outline-none border-b border-border-dark pb-1"
              />
            )}
            <div className="mt-2 flex flex-wrap gap-2 items-center">
              {isReadOnly ? (
                <span className={`border px-2 py-1 text-xs ${status==="Active" ? "bg-emerald-950/60 text-emerald-400 border-emerald-800" : status==="In Development" ? "bg-cyan-950/60 text-cyan-400 border-cyan-800" : status==="Concept" ? "bg-yellow-950/60 text-yellow-400 border-yellow-800" : "bg-orange-950/60 text-orange-400 border-orange-800"}`}>{status}</span>
              ) : (
                <select
                  value={status}
                  onChange={e=> {
                    const newStatus = e.target.value;
                    setStatus(newStatus);
                    saveMetadataImmediate({ status: newStatus });
                  }}
                  className="border border-border-dark bg-dark-900 px-2 py-1 text-xs text-white"
                >
                  <option>Concept</option><option>In Development</option><option>Active</option><option>Archived</option>
                </select>
              )}
              {isReadOnly ? (
                <span className="text-xs text-slate-500">{tagsStr || (()=>{ try{ return JSON.parse(project.tags).join(", "); } catch{ return ""; }})()}</span>
              ) : (
                <input
                  value={tagsStr}
                  onChange={e=> setTagsStr(e.target.value)}
                  onBlur={e=> {
                    const arr = e.target.value.split(",").map(s=>s.trim()).filter(Boolean);
                    saveMetadataImmediate({ tags: JSON.stringify(arr) });
                  }}
                  placeholder="Tags comma separated"
                  className="border border-border-dark bg-dark-900 px-2 py-1 text-xs text-white placeholder:text-slate-600"
                />
              )}
            </div>
            {isReadOnly ? (
              <p className="mt-3 text-sm leading-relaxed" style={{ color: (project as unknown as { summaryColor: string }).summaryColor ?? "#94a3b8" }}>{description || project.description}</p>
            ) : (
              <>
                <textarea
                  value={description}
                  onChange={e=> setDescription(e.target.value)}
                  onBlur={e=> saveMetadataImmediate({ description: e.target.value })}
                  rows={2}
                  placeholder="Description"
                  className="mt-3 w-full border border-border-dark bg-dark-900 p-2 text-xs text-slate-300"
                />
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <select
                    value={project.icon}
                    onChange={e=> {
                      const newIcon = e.target.value;
                      setProject(prev=> prev ? { ...prev, icon: newIcon } : prev);
                      saveMetadataImmediate({ icon: newIcon });
                    }}
                    className="border border-border-dark bg-dark-900 px-2 py-1 text-xs text-white"
                  >
                    {Object.keys(ICON_MAP).map(k=> <option key={k} value={k}>{k}</option>)}
                  </select>
                  <input
                    value={project.iconColor}
                    onChange={e=> setProject(prev=> prev ? { ...prev, iconColor: e.target.value } : prev)}
                    onBlur={e=> saveMetadataImmediate({ iconColor: e.target.value })}
                    placeholder="linear-gradient(135deg, #00f0ff, #4338ca)"
                    className="border border-border-dark bg-dark-900 px-2 py-1 text-xs text-white"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="border border-border-dark bg-dark-700 p-4 sm:p-6 space-y-3">
        {!isReadOnly && (
          <div className="flex flex-wrap gap-1.5 pb-3 border-b border-border-dark">
            <span className="text-[11px] tracking-widest text-slate-500 py-1">+ Add Block:</span>
            {[
              ["paragraph","Text"], ["heading1","H1"], ["heading2","H2"], ["heading3","H3"], ["bullet","Bullet"], ["numbered","Numbered"], ["todo","To-do"], ["code","Code"], ["image","Media"]
            ].map(([t,label])=> (
              <button key={t} onClick={()=> addBlock(t as Block["type"])} className="border border-border-dark bg-dark-900 px-2 py-1 text-xs text-slate-300 hover:text-white">{label}</button>
            ))}
          </div>
        )}

        {blocks.map((b, idx) => (
          <div key={b.id} data-block-id={b.id} draggable={false} onDragStart={(e)=> { if (isReadOnly) return; setDraggedBlock(b.id); const el = e.currentTarget as HTMLElement; if (e.dataTransfer) { e.dataTransfer.effectAllowed='move'; try { e.dataTransfer.setDragImage(el, 20, 20); } catch {} } }} onDragEnd={()=> setDraggedBlock(null)} onDragOver={e=> !isReadOnly && e.preventDefault()} onDrop={e=> {
            if (isReadOnly) return;
            e.preventDefault();
            if (!draggedBlock || draggedBlock===b.id) return;
            const fromIdx = blocks.findIndex(x=> x.id===draggedBlock);
            const toIdx = blocks.findIndex(x=> x.id===b.id);
            if (fromIdx===-1 || toIdx===-1) return;
            const arr=[...blocks]; const [moved]=arr.splice(fromIdx,1); arr.splice(toIdx,0,moved);
            setBlocks(arr);
            setDraggedBlock(null);
          }} className={`group flex ${b.type==="todo"||b.type==="bullet"||b.type==="numbered" ? "gap-1 py-0.5" : "gap-2"} ${draggedBlock===b.id ? "opacity-40" : ""}`}>
            {!isReadOnly && (
              <div className="flex flex-col gap-1 pt-1 opacity-0 group-hover:opacity-100 shrink-0">
                <div draggable onDragStart={(e)=> { e.stopPropagation(); setDraggedBlock(b.id); const blockEl = (e.currentTarget as HTMLElement).closest('[data-block-id]') as HTMLElement; if (blockEl && e.dataTransfer) { e.dataTransfer.effectAllowed='move'; try { e.dataTransfer.setData('text/plain', b.id); e.dataTransfer.setDragImage(blockEl, 20, 20); } catch {} if (blockEl) blockEl.style.opacity='0.6'; } }} onDragEnd={(e)=> { setDraggedBlock(null); const blockEl = (e.currentTarget as HTMLElement).closest('[data-block-id]') as HTMLElement; if (blockEl) blockEl.style.opacity=''; }} className="flex items-center justify-center w-5 h-5 border border-border-dark bg-dark-900 cursor-grab active:cursor-grabbing">
                  <LayoutGrid className="h-3 w-3 text-slate-500" />
                </div>
                <button onClick={()=> removeBlock(b.id)} className="border border-border-dark bg-dark-900 p-1 text-slate-500 hover:text-accent-red"><Trash2 className="h-3 w-3" /></button>
              </div>
            )}
            <div className="flex-1">
              {b.type==="paragraph" && (isReadOnly ? <p className="py-1 text-sm leading-relaxed text-slate-300 whitespace-pre-wrap">{b.text || <span className="text-slate-600">Empty</span>}</p> : <textarea value={b.text} onChange={e=> updateBlock(b.id, { text: e.target.value })} placeholder="Paragraph (markdown)..." rows={Math.max(1,b.text.split("\n").length)} className="w-full bg-transparent text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none py-1" />)}
              {b.type==="heading1" && (isReadOnly ? <h1 className="py-1 text-2xl font-bold text-white">{b.text}</h1> : <input value={b.text} onChange={e=> updateBlock(b.id, { text:e.target.value })} placeholder="Heading 1" className="w-full bg-transparent text-2xl font-bold text-white placeholder:text-slate-600 focus:outline-none py-1" />)}
              {b.type==="heading2" && (isReadOnly ? <h2 className="py-1 text-xl font-bold text-white">{b.text}</h2> : <input value={b.text} onChange={e=> updateBlock(b.id, { text:e.target.value })} placeholder="Heading 2" className="w-full bg-transparent text-xl font-bold text-white placeholder:text-slate-600 focus:outline-none py-1" />)}
              {b.type==="heading3" && (isReadOnly ? <h3 className="py-1 text-lg font-bold text-white">{b.text}</h3> : <input value={b.text} onChange={e=> updateBlock(b.id, { text:e.target.value })} placeholder="Heading 3" className="w-full bg-transparent text-lg font-bold text-white placeholder:text-slate-600 focus:outline-none py-1" />)}
              {b.type==="bullet" && (isReadOnly ? <li className="ml-4 list-disc py-0.5 text-sm text-slate-300">{b.text}</li> : <div className="flex gap-1"><span className="pt-0.5 text-slate-500">•</span><input value={b.text} onChange={e=> updateBlock(b.id, { text:e.target.value })} onKeyDown={e=> {
                if(e.key==="Enter"){
                  e.preventDefault();
                  if(b.text.trim()===""){ updateBlock(b.id, { type: "paragraph", text: "" } as unknown as Partial<Block>); }
                  else { const nb: Block = { id: Date.now().toString(36), type: "bullet", text:"" }; const idx2=blocks.findIndex(x=> x.id===b.id); const copy=[...blocks]; copy.splice(idx2+1,0,nb); setBlocks(copy); }
                }
              }} placeholder="Bullet point (Enter: new bullet, empty Enter: exit)" className="flex-1 bg-transparent text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none py-0.5" /></div>)}
              {b.type==="numbered" && (isReadOnly ? <div className="py-0.5 text-sm text-slate-300">{idx+1}. {b.text}</div> : <div className="flex gap-1"><span className="pt-0.5 text-slate-500">{idx+1}.</span><input value={b.text} onChange={e=> updateBlock(b.id, { text:e.target.value })} onKeyDown={e=> {
                if(e.key==="Enter"){
                  e.preventDefault();
                  if(b.text.trim()===""){ updateBlock(b.id, { type: "paragraph", text: "" } as unknown as Partial<Block>); }
                  else { const nb: Block = { id: Date.now().toString(36), type: "numbered", text:"" }; const idx2=blocks.findIndex(x=> x.id===b.id); const copy=[...blocks]; copy.splice(idx2+1,0,nb); setBlocks(copy); }
                }
              }} placeholder="Numbered item (Enter: new, empty: exit)" className="flex-1 bg-transparent text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none py-0.5" /></div>)}
              {b.type==="todo" && (
                <div className="flex items-center gap-1 py-0.5">
                  <label className="flex items-center cursor-pointer">
                    <input type="checkbox" checked={b.checked} onChange={e=> isReadOnly ? null : updateBlock(b.id, { checked: e.target.checked } as Partial<Block>)} disabled={isReadOnly} className="sr-only" />
                    {b.checked ? (
                      <span className="w-4 h-4 bg-[#092318] border border-emerald-500 text-emerald-400 rounded-none flex items-center justify-center"><Check className="h-3 w-3 text-emerald-400" /></span>
                    ) : (
                      <span className="w-4 h-4 bg-[#070b11] border border-[#1e293b] rounded-none cursor-pointer hover:border-cyan-400"></span>
                    )}
                  </label>
                  {isReadOnly ? <span className={`text-sm transition-colors ${b.checked ? "line-through text-slate-600" : "text-slate-300"}`}>{b.text}</span> : <input value={b.text} onChange={e=> updateBlock(b.id, { text:e.target.value })} onKeyDown={e=> {
                    if(e.key==="Enter"){
                      e.preventDefault();
                      if(b.text.trim()===""){ updateBlock(b.id, { type: "paragraph", text: "" } as unknown as Partial<Block>); }
                      else { const nb: Block = { id: Date.now().toString(36), type: "todo", text:"", checked:false }; const idx2=blocks.findIndex(x=> x.id===b.id); const copy=[...blocks]; copy.splice(idx2+1,0,nb); setBlocks(copy); }
                    }
                  }} placeholder="To-do (Enter: new, empty: exit)" className={`flex-1 bg-transparent text-sm focus:outline-none transition-colors ${b.checked ? "line-through text-slate-600" : "text-slate-300"}`} />}
                </div>
              )}
              {b.type==="code" && (
                <div className="relative border border-border-dark bg-dark-900">
                  {isReadOnly ? <pre className="p-3 text-xs leading-relaxed text-slate-300 whitespace-pre-wrap">{b.text}</pre> : <textarea value={b.text} onChange={e=> updateBlock(b.id, { text:e.target.value })} rows={4} placeholder="Code..." className="w-full bg-transparent p-3 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none" />}
                  <button onClick={async()=> { await navigator.clipboard.writeText(b.text); setCopied(b.id); setTimeout(()=> setCopied(null), 1200); }} className="absolute top-1 right-1 border border-border-dark bg-dark-700 p-1 text-slate-400 hover:text-white">{copied===b.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}</button>
                </div>
              )}
              {b.type==="image" && (
                isReadOnly ? (
                  b.url ? (()=>{ const emb=toEmbedUrl(b.url); if(emb) return <div className="w-full aspect-video min-h-[380px] max-h-[550px] border border-border-dark bg-dark-900 my-4 overflow-hidden"><iframe src={emb} className="w-full h-full border-none" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={b.caption ?? "media"} /></div>; if(b.url.match(/\.(mp4|webm)$/)) return <video src={b.url} controls className="w-full max-h-[360px] border border-border-dark" />; return <img src={b.url} alt={b.caption ?? ""} className="w-full max-h-[360px] object-contain border border-border-dark" />; })() : <p className="text-xs text-slate-600">No media</p>
                ) : (
                  <div className="space-y-2">
                    <input value={b.url} onChange={e=> updateBlock(b.id, { url: e.target.value } as Partial<Block>)} placeholder="https:// image, video or YouTube URL" className="w-full border border-border-dark bg-dark-900 px-2 py-1.5 text-xs text-white placeholder:text-slate-600" />
                    {b.url && (()=>{ const emb=toEmbedUrl(b.url); if(emb) return <div className="w-full aspect-video min-h-[380px] max-h-[550px] border border-border-dark bg-dark-900 my-4 overflow-hidden"><iframe src={emb} className="w-full h-full border-none" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="preview" /></div>; if(b.url.match(/\.(mp4|webm)$/)) return <video src={b.url} controls className="w-full max-h-[200px] border border-border-dark" />; return <img src={b.url} alt="" className="w-full max-h-[200px] object-contain border border-border-dark bg-dark-900" />; })()}
                  </div>
                )
              )}
            </div>
          </div>
        ))}

        {!isReadOnly && blocks.length===0 && <p className="text-xs text-slate-600 py-4">No blocks — add one above.</p>}
      </div>
    </div>
  );
}
