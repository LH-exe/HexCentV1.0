"use client";

import { useEffect, useState, useCallback } from "react";
import { useDebouncedSave } from "@/lib/hooks/useDebouncedSave";
import { cn } from "@/lib/utils";
import {
  Plus, Search, FileText, Trash2, Loader2, Check, AlertTriangle, FilePlus,
  Folder, LayoutGrid, ListTodo, StickyNote, Plug, ChevronDown, ChevronRight, Edit3, FolderPlus,
  Bold, Italic, Underline, Code2, Palette, X, Minus, ArrowLeft,
  Cpu, Activity, Shield, Terminal, Database, Zap, Code, LineChart, Layers, Lock, Highlighter, Type, type LucideIcon
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Cpu, Activity, Shield, Terminal, Database, Zap, Code,
  Folder, LineChart, FileText, Layers, Lock
};

function RenderIcon({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) {
  const IconComp = ICON_MAP[name] || FileText;
  return <IconComp className={className ?? "w-5 h-5"} style={style} />;
}

function statusBadgeClass(status: string): string {
  if (status === "Active") return "bg-emerald-950/60 text-emerald-400 border border-emerald-800";
  if (status === "Archived") return "bg-orange-950/60 text-orange-400 border border-orange-800";
  if (status === "Concept") return "bg-yellow-950/60 text-yellow-400 border border-yellow-800";
  if (status === "In Development") return "bg-cyan-950/60 text-cyan-400 border border-cyan-800";
  return "border border-border-dark text-slate-500 bg-dark-900";
}

type Doc = { id: string; title: string; content: string; icon: string | null; folderId: string | null; createdAt: string; updatedAt: string };
type FolderData = { id: string; name: string; color: string | null; parentId: string | null };
type Block = { id: string; type: "paragraph" | "heading" | "heading1" | "heading2" | "heading3" | "code" | "bullet" | "numbered" | "todo" | "image"; text: string; checked?: boolean; url?: string; fontFamily?: string; fontSize?: string; bold?: boolean; italic?: boolean; strike?: boolean; codeInline?: boolean; color?: string; highlightColor?: string };
type Task = { id: string; title: string; completed: boolean; priority: string };
type WCard = { id: string; title: string; description: string; icon: string; iconColor: string; titleColor: string; summaryColor: string; status: string; tags: string; content: string };

const ICON_OPTIONS = ["FileText","Folder","Cpu","Activity","Shield","Terminal","Database","Zap","Code","LineChart","Layers","Lock"];

function autoResize(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

const GOOGLE_COLORS = [
  "#000000","#434343","#666666","#999999","#b7b7b7","#cccccc","#d9d9d9","#efefef","#f3f3f3","#ffffff",
  "#980000","#ff0000","#ff9900","#ffff00","#00ff00","#00ffff","#4a86e8","#0000ff","#9900ff","#ff00ff",
  "#e6b8af","#f4cccc","#fce5cd","#fff2cc","#d9ead3","#d0e0e3","#c9daf8","#cfe2f3","#d9d2e9","#ead1dc",
  "#dd7e6b","#ea9999","#f9cb9c","#ffe599","#b6d7a8","#a2c4c9","#9fc5e8","#b4a7d6","#d5a6bd",
  "#cc4125","#e06666","#f6b26b","#ffd966","#93c47d","#76a5af","#6d9eeb","#8e7cc3","#c27ba0",
  "#a61c00","#cc0000","#e69138","#f1c232","#6aa84f","#45818e","#3d85c6","#674ea7","#a64d79",
  "#85200c","#990000","#b45f06","#bf9000","#38761d","#134f5c","#0b5394","#351c75","#741b47",
  "#5b0f00","#660000","#783f04","#7f6000","#274e13","#0c343d","#073763","#20124d","#4c1130",
];

function parseContent(rawContent: string | null | undefined | any): Block[] {
  const empty: Block = { id: "1", type: "paragraph", text: "", fontFamily: "Times New Roman", fontSize: "11" };
  if (!rawContent) {
    return [empty];
  }
  if (Array.isArray(rawContent)) {
    return rawContent.length > 0
      ? (rawContent as any[]).map((b: any) => ({
          fontFamily: "Times New Roman",
          fontSize: "11",
          ...b,
          id: b?.id ?? Math.random().toString(36).slice(2, 8),
          type: b?.type ?? "paragraph",
          text: b?.text ?? b?.content ?? "",
        })) as Block[]
      : [empty];
  }
  if (typeof rawContent === "string") {
    try {
      const parsed = JSON.parse(rawContent);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return (parsed as any[]).map((b: any) => ({
          fontFamily: "Times New Roman",
          fontSize: "11",
          ...b,
          id: b?.id ?? Math.random().toString(36).slice(2, 8),
          type: b?.type ?? "paragraph",
          text: b?.text ?? b?.content ?? "",
        })) as Block[];
      }
      if (typeof parsed === "string") {
        return [{ ...empty, text: parsed }];
      }
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const obj = parsed as any;
        return [
          {
            fontFamily: "Times New Roman",
            fontSize: "11",
            ...obj,
            id: obj?.id ?? "1",
            type: obj?.type ?? "paragraph",
            text: obj?.text ?? obj?.content ?? "",
          } as Block,
        ];
      }
    } catch {
      if (rawContent === "[]") return [empty];
      return [{ ...empty, text: rawContent }];
    }
    if (rawContent === "[]") return [empty];
    return [{ ...empty, text: rawContent }];
  }
  if (typeof rawContent === "object") {
    const obj = rawContent as any;
    if (obj && (obj.text !== undefined || obj.content !== undefined || obj.type !== undefined)) {
      return [
        {
          fontFamily: "Times New Roman",
          fontSize: "11",
          ...obj,
          id: obj?.id ?? "1",
          type: obj?.type ?? "paragraph",
          text: obj?.text ?? obj?.content ?? "",
        } as Block,
      ];
    }
    return [empty];
  }
  return [empty];
}
function serialize(blocks: Block[]): string { return JSON.stringify(blocks); }

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

export default function WorkspacePage() {
  const [role, setRole] = useState<"ADMIN" | null>(null);
  const [activeTab, setActiveTab] = useState<"docs" | "gallery" | "tasks" | "integration">("docs");

  const [docs, setDocs] = useState<Doc[]>([]);
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState("");
  const [editFolderColor, setEditFolderColor] = useState("#00f0ff");
  const [dragged, setDragged] = useState<{ type: "doc" | "folder"; id: string } | null>(null);
  const [draggedBlock, setDraggedBlock] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("📄");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([{ id: "1", type: "paragraph", text: "", fontFamily: "Times New Roman", fontSize: "11" }]);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [colorHistory, setColorHistory] = useState<string[]>(["#ffffff","#00f0ff","#00ff66","#ff3366","#94a3b8","#f59e0b"]);
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);

  const [cards, setCards] = useState<WCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<WCard | null>(null);
  const [cardBlocks, setCardBlocks] = useState<Block[]>([]);
  const [galleryEditMode, setGalleryEditMode] = useState(true);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");
  const [newPriority, setNewPriority] = useState("NORMAL");
  const [scratchpad, setScratchpad] = useState("");

  const selectedDoc = docs.find(d => d.id === selectedId) ?? null;

  useEffect(() => { const sp = localStorage.getItem("hexcent_scratchpad"); if (sp) setScratchpad(sp); }, []);
  useEffect(() => { localStorage.setItem("hexcent_scratchpad", scratchpad); }, [scratchpad]);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" }).then(r => r.json()).then(d => { if (d.role === "ADMIN") setRole("ADMIN"); else window.location.href = "/login?next=/workspace"; }).catch(()=> window.location.href = "/login?next=/workspace");
  }, []);

  const fetchAll = useCallback(async () => {
    setLoadingList(true);
    try {
      const [docsRes, foldersRes] = await Promise.all([
        fetch("/api/documents", { cache: "no-store" }).then(r => r.json()),
        fetch("/api/folders", { cache: "no-store" }).then(r => r.json()).catch(()=>({ folders: [] })),
      ]);
      setDocs(docsRes.documents ?? []);
      setFolders(foldersRes.folders ?? []);
      foldersRes.folders?.forEach((f: FolderData) => { if (expanded[f.id] === undefined) setExpanded(prev=> ({ ...prev, [f.id]: true })); });
      if (docsRes.documents?.length && !selectedId) setSelectedId(docsRes.documents[0].id);
    } catch {} finally { setLoadingList(false); }
  }, [selectedId]);

  useEffect(() => { if (role==="ADMIN") fetchAll(); }, [fetchAll, role]);

  useEffect(() => {
    if (activeTab === "gallery" && role==="ADMIN") fetch("/api/workspace-cards", { cache: "no-store" }).then(r=>r.json()).then(d=> setCards(d.cards ?? [])).catch(()=>{});
    if (activeTab === "tasks" && role==="ADMIN") fetch("/api/tasks", { cache: "no-store" }).then(r=>r.json()).then(d=> setTasks(d.tasks ?? [])).catch(()=>{});
  }, [activeTab, role]);

  const savePayload = { title, icon, folderId, content: serialize(blocks) };
  const doSave = useCallback(async (payload: typeof savePayload) => {
    if (!selectedId) return;
    const res = await fetch(`/api/documents/${selectedId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error("Save failed");
    const data = await res.json();
    setDocs(prev => prev.map(d => d.id === selectedId ? { ...d, ...data.document } : d));
  }, [selectedId]);
  const { status, error: saveError, resetBaseline } = useDebouncedSave(savePayload, doSave, 900, !!selectedId && role==="ADMIN");

  const saveCardContent = useCallback(async (payload: { content: string }) => {
    if (!selectedCard) return;
    await fetch(`/api/workspace-cards/${selectedCard.id}`, { method: "PATCH", headers: { "Content-Type":"application/json"}, body: JSON.stringify(payload) });
  }, [selectedCard]);
  const { status: cardSaveStatus, resetBaseline: resetCardBaseline } = useDebouncedSave({ content: serialize(cardBlocks) }, saveCardContent as unknown as (v: { content: string })=>Promise<void>, 1500, !!selectedCard);

  // Fetch full document content on selection — resets debounced baseline to prevent hydration false-dirty
  useEffect(() => {
    if (!selectedId) {
      setTitle("");
      setIcon("📄");
      setFolderId(null);
      setBlocks([]);
      resetBaseline({ title: "", icon: "📄", folderId: null, content: serialize([]) });
      return;
    }

    let isMounted = true;
    async function loadSelectedDocument() {
      try {
        const res = await fetch(`/api/documents/${selectedId}`);
        if (!res.ok) throw new Error("Failed to load document");
        const data = await res.json();
        if (isMounted && data.document) {
          const docTitle = data.document.title || "Untitled Document";
          const allowed = ["📄","📝","📊","📌","💡","📓","📒"];
          const rawIcon = data.document.icon ?? "📄";
          const isAllowed = allowed.includes(rawIcon);
          const docIcon = isAllowed ? rawIcon : "📄";
          const docFolderId = data.document.folderId ?? null;
          setTitle(docTitle);
          setIcon(docIcon);
          setFolderId(docFolderId);
          // Parse content JSON AST safely
          let parsedBlocks: Block[];
          try {
            const rawContent = data.document.content;
            const parsed = typeof rawContent === "string" ? JSON.parse(rawContent) : rawContent;
            if (Array.isArray(parsed) && parsed.length > 0) {
              // Normalize blocks to ensure text field and defaults
              const normalized = parsed.map((b: any) => ({
                fontFamily: "Times New Roman",
                fontSize: "11",
                ...b,
                text: b.text ?? b.content ?? "",
              }));
              parsedBlocks = normalized as Block[];
              setBlocks(normalized as Block[]);
            } else {
              parsedBlocks = parseContent(data.document.content);
              setBlocks(parsedBlocks);
            }
          } catch {
            parsedBlocks = parseContent(data.document.content);
            setBlocks(parsedBlocks);
          }
          // Reset dirty baseline so save spinner does not fire immediately on hydration
          resetBaseline({ title: docTitle, icon: docIcon, folderId: docFolderId, content: serialize(parsedBlocks) });
        }
      } catch (err) {
        console.error("Error loading selected document:", err);
      }
    }

    loadSelectedDocument();
    return () => {
      isMounted = false;
    };
  }, [selectedId, resetBaseline]);

  useEffect(() => {
    if (!selectedCard) return;
    const cardId = selectedCard.id;
    const fallbackContent = selectedCard.content;
    let isMounted = true;
    async function loadSelectedCard() {
      try {
        const res = await fetch(`/api/workspace-cards/${cardId}`);
        if (!res.ok) throw new Error("Failed to load card");
        const data = await res.json();
        const cardData = data.card || data.workspaceCard || data.document;
        if (isMounted && cardData) {
          // Update selectedCard with full data if needed
          setSelectedCard(prev => prev ? { ...prev, ...cardData } : prev);
          const content = cardData.content ?? fallbackContent;
          const parsed = parseContent(content);
          setCardBlocks(parsed);
          resetCardBaseline({ content: serialize(parsed) });
          setGalleryEditMode(false);
        } else if (isMounted) {
          const parsed = parseContent(fallbackContent);
          setCardBlocks(parsed);
          resetCardBaseline({ content: serialize(parsed) });
          setGalleryEditMode(false);
        }
      } catch (err) {
        console.error("Error loading selected card:", err);
        if (isMounted) {
          // SAFE FALLBACK: Guard against null with optional chaining and fallback parsing
          const fallback = selectedCard?.content ? parseContent(selectedCard.content) : parseContent(fallbackContent ?? null);
          setCardBlocks(fallback);
          resetCardBaseline({ content: serialize(fallback) });
          setGalleryEditMode(false);
        }
      }
    }
    loadSelectedCard();
    return () => {
      isMounted = false;
    };
  }, [selectedCard?.id, resetCardBaseline]);

  // Keyboard shortcuts for formatting
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (!selectedBlock) return;
      const lower = e.key.toLowerCase();
      if (lower === "b") {
        e.preventDefault();
        setBlocks(prev => prev.map(b => b.id === selectedBlock ? { ...b, bold: !b.bold } : b));
      } else if (lower === "i") {
        e.preventDefault();
        setBlocks(prev => prev.map(b => b.id === selectedBlock ? { ...b, italic: !b.italic } : b));
      } else if (lower === "u") {
        e.preventDefault();
        setBlocks(prev => prev.map(b => b.id === selectedBlock ? { ...b, strike: !b.strike } : b));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedBlock]);

  async function handleCreateDoc() {
    const res = await fetch("/api/documents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "Untitled Document", content: "[]", icon: "📄", folderId: null }) });
    const data = await res.json();
    if (!res.ok) { alert(data.error ?? "Create failed"); return; }
    setDocs(p => [data.document, ...p]);
    setSelectedId(data.document.id);
  }
  async function handleDeleteDoc(id: string) {
    if (!confirm("Delete?")) return;
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    setDocs(p => p.filter(d => d.id !== id));
    if (selectedId === id) setSelectedId(docs.find(d => d.id !== id)?.id ?? null);
  }
  function updateBlock(id: string, patch: Partial<Block>) { setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b)); setSelectedBlock(id); }
  function addBlock(afterId?: string) {
    const nb: Block = { id: Math.random().toString(36).slice(2, 8), type: "paragraph", text: "", fontFamily: "Times New Roman", fontSize: "11" };
    setBlocks(prev => { if (!afterId) return [...prev, nb]; const idx = prev.findIndex(b=>b.id===afterId); const copy=[...prev]; copy.splice(idx+1,0,nb); return copy; });
  }
  function removeBlock(id: string) { setBlocks(prev => prev.length === 1 ? prev : prev.filter(b=>b.id!==id)); }

  async function createFolderInstant() {
    const res = await fetch("/api/folders", { method: "POST", headers: { "Content-Type":"application/json"}, body: JSON.stringify({ name: "Untitled Folder", color: "#00f0ff", parentId: null }) });
    const data = await res.json();
    if (data.folder) { setFolders(p=> [...p, data.folder]); setExpanded(prev=> ({ ...prev, [data.folder.id]: true })); }
  }
  async function renameFolder(id: string) {
    if (!editFolderName.trim()) return;
    const res = await fetch(`/api/folders/${id}`, { method: "PATCH", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ name: editFolderName.trim(), color: editFolderColor }) });
    if (res.ok) { const d = await res.json(); setFolders(p=> p.map(f=> f.id===id ? { ...f, name: d.folder?.name ?? editFolderName.trim(), color: editFolderColor } : f)); setEditingFolder(null); }
  }
  async function deleteFolder(id: string) {
    if (!confirm("Delete folder? Documents will become unfiled.")) return;
    await fetch(`/api/folders/${id}`, { method: "DELETE" });
    setFolders(p=> p.filter(f=> f.id!==id));
    setDocs(prev=> prev.map(d=> d.folderId===id ? { ...d, folderId: null } : d));
  }
  function isDescendant(ancestorId: string, targetId: string | null): boolean {
    if (!targetId) return false;
    let cur = folders.find(f=> f.id===targetId);
    const visited = new Set<string>();
    while (cur && !visited.has(cur.id)) {
      visited.add(cur.id);
      if (cur.parentId === ancestorId) return true;
      if (cur.id === ancestorId) return true;
      if (!cur.parentId) break;
      cur = folders.find(f=> f.id===cur!.parentId);
    }
    return false;
  }

  async function handleDropOnFolder(targetFolderId: string | null, e?: React.DragEvent) {
    let dragData: { type: "doc" | "folder"; id: string } | null = dragged;
    if (!dragData && e?.dataTransfer) {
      try {
        const raw = e.dataTransfer.getData("application/json") || e.dataTransfer.getData("text/plain");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && (parsed.type === "doc" || parsed.type === "folder") && typeof parsed.id === "string") {
            dragData = parsed;
          }
        }
      } catch {}
    }
    if (!dragData) return;
    if (dragData.type === "doc") {
      setDocs(prev=> prev.map(d=> d.id===dragData!.id ? { ...d, folderId: targetFolderId } : d));
      if (dragData.id === selectedId) {
        setFolderId(targetFolderId);
      }
      // Immediate save within 1s and status feedback via debounced save (folderId change triggers Saving...)
      await fetch(`/api/documents/${dragData.id}`, { method: "PATCH", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ folderId: targetFolderId }) });
    } else if (dragData.type === "folder" && dragData.id !== targetFolderId) {
      if (isDescendant(dragData.id, targetFolderId)) { setDragged(null); return; }
      setFolders(prev=> prev.map(f=> f.id===dragData.id ? { ...f, parentId: targetFolderId } : f));
      await fetch(`/api/folders/${dragData.id}`, { method: "PATCH", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ parentId: targetFolderId }) });
    }
    setDragged(null);
  }

  async function deleteCard(id: string) {
    await fetch(`/api/workspace-cards/${id}`, { method: "DELETE" });
    setCards(p=> p.filter(c=> c.id!==id));
    if (selectedCard?.id===id) setSelectedCard(null);
  }

  async function createTask() {
    if (!newTask.trim()) return;
    const res = await fetch("/api/tasks", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ title: newTask.trim(), priority: newPriority }) });
    const data = await res.json();
    if (data.task) { setTasks(p=>[data.task, ...p]); setNewTask(""); }
  }
  async function toggleTask(t: Task) {
    const res = await fetch(`/api/tasks/${t.id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ completed: !t.completed }) });
    if (res.ok) setTasks(p=> p.map(x=> x.id===t.id ? { ...x, completed: !x.completed } : x));
  }
  async function deleteTask(id: string) {
    await fetch(`/api/tasks/${id}`, { method:"DELETE" });
    setTasks(p=> p.filter(x=> x.id!==id));
  }

  const unassigned = docs.filter(d => !d.folderId && d.title.toLowerCase().includes(search.toLowerCase()));
  const getFolderDocs = (fid: string) => docs.filter(d => d.folderId===fid && d.title.toLowerCase().includes(search.toLowerCase()));
  const getChildren = (pid: string | null) => folders.filter(f => (f.parentId ?? null) === pid);

  function renderFolderTree(parentId: string | null, depth = 0) {
    const children = getChildren(parentId);
    return children.map(f => {
      const isExpanded = expanded[f.id] ?? true;
      const childDocs = getFolderDocs(f.id);
      const subFolders = getChildren(f.id);
      const hasContent = childDocs.length > 0 || subFolders.length > 0;
      return (
        <div key={f.id} className="border border-transparent" draggable onDragStart={(e)=> { e.stopPropagation(); setDragged({ type:"folder", id: f.id }); e.dataTransfer.effectAllowed='move'; try{ e.dataTransfer.setData('application/json', JSON.stringify({type:'folder',id:f.id})); e.dataTransfer.setDragImage(e.currentTarget as HTMLElement, 10, 10); }catch{} }} onDragOver={e=> { e.preventDefault(); e.dataTransfer.dropEffect='move'; }} onDrop={e=> { e.preventDefault(); e.stopPropagation(); handleDropOnFolder(f.id, e); }}>
          <div className="flex items-center gap-1 group" style={{ paddingLeft: depth * 12 }}>
            <button onClick={()=> setExpanded(prev=> ({ ...prev, [f.id]: !isExpanded }))} className="p-1 text-slate-500 hover:text-white">
              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
            {editingFolder===f.id ? (
              <div className="flex-1 flex gap-1">
                <input value={editFolderName} onChange={e=> setEditFolderName(e.target.value)} className="flex-1 border border-border-dark bg-dark-900 px-1 py-1 text-xs text-white" autoFocus />
                <input type="color" value={editFolderColor} onChange={e=> setEditFolderColor(e.target.value)} className="h-6 w-6 border border-border-dark bg-transparent p-0 rounded-none" />
                <button onClick={()=> renameFolder(f.id)} className="px-2 text-xs text-accent-cyan">save</button>
                <button onClick={()=> setEditingFolder(null)} className="px-1 text-slate-500">x</button>
              </div>
            ) : (
              <>
                <div onDragOver={e=> { e.preventDefault(); e.dataTransfer.dropEffect='move'; }} onDrop={e=> { e.preventDefault(); e.stopPropagation(); handleDropOnFolder(f.id, e); }} className="flex-1 flex items-center gap-1.5 py-1 text-xs text-slate-300">
                  <span className="h-2.5 w-2.5 border border-border-dark shrink-0" style={{ background: f.color ?? "#00f0ff" }} />
                  <span className="truncate">{f.name}</span>
                  <span className="text-[11px] text-slate-600">({childDocs.length})</span>
                </div>
                <button onClick={()=> { setEditingFolder(f.id); setEditFolderName(f.name); setEditFolderColor(f.color ?? "#00f0ff"); }} className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-white"><Edit3 className="h-3 w-3" /></button>
                <button onClick={()=> deleteFolder(f.id)} className={`p-1 text-slate-500 hover:text-accent-red ${!hasContent ? "opacity-0 group-hover:opacity-100" : "opacity-0 group-hover:opacity-100"}`} title={!hasContent ? "Delete empty folder" : "Delete folder"}><Trash2 className="h-3 w-3" /></button>
              </>
            )}
          </div>
          {isExpanded && (
            <div className="ml-3 pl-2 border-l border-border-dark/50">
              {childDocs.map(doc=> {
                const docIcon = doc.icon ?? "📄";
                return (
                <div key={doc.id} draggable onDragStart={(e)=> { e.stopPropagation(); setDragged({ type:"doc", id: doc.id }); e.dataTransfer.effectAllowed='move'; try{ e.dataTransfer.setData('application/json', JSON.stringify({type:'doc',id:doc.id})); e.dataTransfer.setDragImage(e.currentTarget as HTMLElement, 10, 10); }catch{} }} className={cn("flex items-center gap-2 border px-2 py-1.5 text-xs", selectedId===doc.id ? "bg-dark-900 border-border-light text-white" : "border-transparent text-slate-400 hover:bg-dark-900")}>
                  <button onClick={()=> setSelectedId(doc.id)} className="flex-1 text-left flex items-center gap-2 truncate">
                    <span className="text-sm shrink-0">{docIcon}</span>
                    <span className="truncate">{doc.title || "Untitled"}</span>
                  </button>
                </div>
                );
              })}
              {renderFolderTree(f.id, depth + 1)}
              {childDocs.length===0 && subFolders.length===0 && <p className="text-[11px] text-slate-600 px-2 py-1">Empty</p>}
            </div>
          )}
        </div>
      );
    });
  }

  if (role !== "ADMIN") {
    return <div className="page-fade-in border border-border-dark bg-dark-700 p-8 text-center font-mono text-xs text-slate-500" style={{ height: "calc(100vh - 180px)", minHeight: 750 }}>Verifying admin...</div>;
  }

  const selBlock = selectedBlock ? blocks.find(b=> b.id===selectedBlock) : null;

  return (
    <div className="page-fade-in font-mono">
      <div className="flex border-b border-border-dark overflow-x-auto">
        {[
          { key: "docs", label: "Documents & Drive", icon: Folder },
          { key: "gallery", label: "Gallery", icon: LayoutGrid },
          { key: "tasks", label: "Tasks & Notes", icon: ListTodo },
          { key: "integration", label: "Integration", icon: Plug },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key as typeof activeTab)} className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-xs tracking-widest whitespace-nowrap ${activeTab===t.key ? "border-white text-white bg-dark-700" : "border-transparent text-slate-500 hover:text-white"}`}>
            <t.icon className="h-3.5 w-3.5" /> {t.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 px-3 text-[11px] tracking-widest shrink-0">
          {status==="syncing" && <span className="flex items-center gap-1 text-slate-400"><Loader2 className="h-3 w-3 animate-spin" /> Saving...</span>}
          {status==="saved" && <span className="flex items-center gap-1 text-slate-500"><Check className="h-3 w-3" /> All changes saved</span>}
          {status==="error" && <span className="flex items-center gap-1 text-accent-red"><AlertTriangle className="h-3 w-3" /> {saveError}</span>}
        </div>
      </div>

      <div key={activeTab} className="page-fade-in">
      {activeTab === "docs" && (
        <div className="flex flex-col lg:flex-row gap-4 mt-4" style={{ height: "calc(100vh - 180px)", minHeight: 750 }}>
          <aside className="w-full lg:w-[340px] shrink-0 border border-border-dark bg-dark-700 flex flex-col overflow-hidden" style={{ height: "calc(100vh - 180px)", minHeight: 750 }}>
            <div className="p-3 border-b border-border-dark">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <input value={search} onChange={e=> setSearch(e.target.value)} placeholder="Filter Documents" className="w-full border border-border-dark bg-dark-900 pl-8 pr-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none" />
              </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              <div className="h-[60%] overflow-y-auto p-2 space-y-1" style={{ scrollbarWidth: "thin" }} onDragOver={e=> { e.preventDefault(); e.dataTransfer.dropEffect='move'; }} onDrop={(e)=> { e.preventDefault(); handleDropOnFolder(null, e); }}>
                <div className="text-[11px] tracking-widest text-slate-500 px-1 py-1">FOLDERS</div>
                <div className="flex items-center gap-1 border border-border-dark bg-dark-900 px-2 py-1.5 text-xs text-white" onDragOver={e=> { e.preventDefault(); e.dataTransfer.dropEffect='move'; }} onDrop={e=> { e.preventDefault(); e.stopPropagation(); handleDropOnFolder(null, e); }}>
                  <span className="h-2.5 w-2.5 border border-border-dark bg-accent-cyan" />
                  <span className="flex-1 font-bold">Root (Unassigned)</span>
                  <span className="text-[11px] text-slate-500">({folders.filter(f=> !f.parentId).length} folders, {docs.filter(d=> !d.folderId).length} docs)</span>
                </div>
                {renderFolderTree(null, 0)}
              </div>

              <div className="h-px bg-border-dark shrink-0" />

              <div className="h-[40%] overflow-y-auto p-2 space-y-1" style={{ scrollbarWidth: "thin" }} onDragOver={e=> { e.preventDefault(); e.dataTransfer.dropEffect='move'; }} onDrop={(e)=> { e.preventDefault(); handleDropOnFolder(null, e); }}>
                <div className="text-[11px] tracking-widest text-slate-500 px-1 py-1">UNASSIGNED DOCUMENTS</div>
                {loadingList ? <div className="py-4 text-center text-xs text-slate-500 flex justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div> :
                 unassigned.length===0 ? <div className="py-3 text-center"><FilePlus className="h-5 w-5 text-slate-600 mx-auto" /><p className="mt-1 text-xs text-slate-600">No unassigned docs</p></div> :
                 unassigned.map(doc=> {
                  const docIcon = doc.icon ?? "📄";
                  return (
                  <div key={doc.id} draggable onDragStart={(e)=> { e.stopPropagation(); setDragged({ type:"doc", id: doc.id }); e.dataTransfer.effectAllowed='move'; try{ e.dataTransfer.setData('application/json', JSON.stringify({type:'doc',id:doc.id})); e.dataTransfer.setDragImage(e.currentTarget as HTMLElement, 10, 10); }catch{} }} className={cn("flex items-center gap-2 border px-2 py-1.5 text-xs", selectedId===doc.id ? "bg-dark-900 border-border-light text-white" : "border-transparent text-slate-400 hover:bg-dark-900")}>
                    <button onClick={()=> setSelectedId(doc.id)} className="flex-1 text-left flex items-center gap-2 truncate">
                      <span className="text-sm shrink-0">{docIcon}</span><span className="truncate">{doc.title || "Untitled"}</span>
                    </button>
                  </div>
                 );
                })}
              </div>

              <div className="p-2 border-t border-border-dark flex gap-2 shrink-0 bg-dark-700">
                <button onClick={handleCreateDoc} className="flex-1 flex items-center justify-center gap-1.5 border border-border-dark bg-[#070b11] py-2.5 text-xs font-bold tracking-widest text-slate-200 hover:bg-[#0c121c] hover:border-cyan-400">
                  <Plus className="h-3.5 w-3.5" /> NEW DOCUMENT
                </button>
                <button onClick={createFolderInstant} title="New Folder" className="h-[42px] w-[42px] shrink-0 flex items-center justify-center border border-border-dark bg-dark-900 text-slate-300 hover:text-white hover:border-border-light">
                  <FolderPlus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </aside>

          <section className="flex-1 border border-border-dark bg-dark-700 flex flex-col overflow-hidden" style={{ height: "calc(100vh - 180px)", minHeight: 750 }}>
            {!selectedDoc ? (
              <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-slate-600 font-mono text-xs">
                <FileText className="w-10 h-10 mb-3 opacity-30 text-slate-500"/>
                <span>Create or Open a document to begin</span>
              </div>
            ) : (
              <>
                <div className="border-b border-border-dark bg-dark-900 px-4 py-3 flex flex-wrap items-center gap-3">
                  <div className="w-12 h-10 border border-border-dark bg-dark-900 flex items-center justify-center shrink-0">
                    <select value={icon} onChange={e=> setIcon(e.target.value)} className="w-full h-full bg-dark-900 text-white text-lg focus:outline-none text-center" style={{ textAlign: "center", textAlignLast: "center" }}>
                      {["📄","📝","📊","📌","💡","📓","📒"].map(o=> <option key={o} value={o} className="text-center">{o}</option>)}
                    </select>
                  </div>
                  <div className="h-10 flex-1 border border-border-dark bg-dark-900 px-3 text-white placeholder-slate-500 focus-within:border-cyan-400 flex items-center min-w-[180px]">
                    <input value={title} onChange={e=> setTitle(e.target.value)} placeholder="Untitled Document" className="w-full bg-transparent text-sm font-bold text-white placeholder:text-slate-500 focus:outline-none" />
                  </div>
                  <select value={folderId ?? ""} onChange={e=> { const nid = e.target.value || null; setFolderId(nid); if(selectedId) fetch(`/api/documents/${selectedId}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ folderId: nid })}); }} className="h-10 border border-border-dark bg-dark-900 px-3 text-slate-300 text-xs focus:border-cyan-400">
                    <option value="">No folder</option>
                    {folders.map(f=> <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                  <button onClick={()=> { if (!selectedDoc?.id) return; handleDeleteDoc(selectedDoc.id); }} className="h-10 w-10 border border-accent-red/20 bg-dark-900 flex items-center justify-center text-accent-red shrink-0"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>

                <div className="border-b border-border-dark bg-dark-900 px-3 py-2 flex flex-wrap items-center gap-2 text-xs">
                  <select value={selBlock?.fontFamily ?? "Times New Roman"} onChange={e=> selBlock && updateBlock(selBlock.id, { fontFamily: e.target.value })} className="border border-border-dark bg-dark-700 px-2 py-1 text-white">
                    <option>Times New Roman</option><option>Arial</option><option>Roboto</option><option>Geist Mono</option><option>Fira Code</option><option>Inter</option>
                  </select>
                  <select value={(() => {
                    const fs = selBlock?.fontSize ?? "11";
                    const bold = selBlock?.bold;
                    const italic = selBlock?.italic;
                    if (fs === "22" && bold) return "Title";
                    if (fs === "16" && italic) return "Subtitle";
                    if (fs === "22") return "Heading 1";
                    if (fs === "18") return "Heading 2";
                    if (fs === "16") return "Heading 3";
                    return "Normal Text";
                  })()} onChange={e=> {
                    const v = e.target.value;
                    if (selBlock) {
                      if (v==="Title") updateBlock(selBlock.id, { fontSize: "22", bold: true });
                      else if (v==="Subtitle") updateBlock(selBlock.id, { fontSize: "16", italic: true });
                      else if (v==="Heading 1") updateBlock(selBlock.id, { fontSize: "22", bold: true });
                      else if (v==="Heading 2") updateBlock(selBlock.id, { fontSize: "18", bold: true });
                      else if (v==="Heading 3") updateBlock(selBlock.id, { fontSize: "16", bold: true });
                      else updateBlock(selBlock.id, { fontSize: "14" });
                    }
                  }} className="border border-border-dark bg-dark-700 px-2 py-1 text-white">
                    <option>Normal Text</option><option>Title</option><option>Subtitle</option><option>Heading 1</option><option>Heading 2</option><option>Heading 3</option>
                  </select>
                  <div className="flex items-center gap-1 border border-border-dark bg-dark-700 px-1 py-1">
                    <button onClick={()=> {
                      const cur = parseInt((selBlock?.fontSize ?? "11").toString().replace(/\D/g,"") || "11");
                      const next = Math.max(8, cur - 1);
                      if (selBlock) updateBlock(selBlock.id, { fontSize: next.toString() });
                    }} className="h-5 w-5 flex items-center justify-center border border-border-dark bg-dark-900 text-slate-400 hover:text-white"><Minus className="h-3 w-3" /></button>
                    <input type="number" value={selBlock?.fontSize?.match(/^\d+$/) ? selBlock.fontSize : "11"} onChange={e=> { const v = e.target.value; if (selBlock && /^\d+$/.test(v)) updateBlock(selBlock.id, { fontSize: v }); }} className="w-10 text-center bg-dark-900 text-white border border-border-dark text-xs py-0.5 focus:outline-none" min={8} max={32} />
                    <button onClick={()=> {
                      const cur = parseInt((selBlock?.fontSize ?? "11").toString().replace(/\D/g,"") || "11");
                      const next = Math.min(32, cur + 1);
                      if (selBlock) updateBlock(selBlock.id, { fontSize: next.toString() });
                    }} className="h-5 w-5 flex items-center justify-center border border-border-dark bg-dark-900 text-slate-400 hover:text-white"><Plus className="h-3 w-3" /></button>
                  </div>
                  <div className="flex gap-1">
                    <button title="Bold Ctrl+B" onClick={()=> selBlock && updateBlock(selBlock.id, { bold: !selBlock.bold })} className={`w-7 h-7 flex items-center justify-center border text-[11px] font-bold rounded-none ${selBlock?.bold ? "bg-white text-dark-900 border-white" : "bg-dark-700 text-slate-400 border-border-dark"}`}>B</button>
                    <button title="Italic Ctrl+I" onClick={()=> selBlock && updateBlock(selBlock.id, { italic: !selBlock.italic })} className={`w-7 h-7 flex items-center justify-center border italic rounded-none ${selBlock?.italic ? "bg-white text-dark-900 border-white" : "bg-dark-700 text-slate-400 border-border-dark"}`}>I</button>
                    <button title="Underline Ctrl+U" onClick={()=> selBlock && updateBlock(selBlock.id, { strike: !selBlock.strike })} className={`w-7 h-7 flex items-center justify-center border underline rounded-none ${selBlock?.strike ? "bg-white text-dark-900 border-white" : "bg-dark-700 text-slate-400 border-border-dark"}`}>U</button>
                    <button title="Code Inline" onClick={()=> selBlock && updateBlock(selBlock.id, { codeInline: !selBlock.codeInline })} className={`w-7 h-7 flex items-center justify-center border rounded-none ${selBlock?.codeInline ? "bg-white text-dark-900 border-white" : "bg-dark-700 text-slate-400 border-border-dark"}`}><Code2 className="h-3 w-3" /></button>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="relative">
                      <button onClick={()=> { setShowTextColorPicker(v=> !v); setShowHighlightPicker(false); }} title="Text color" className={`w-7 h-7 flex flex-col items-center justify-center border rounded-none ${showTextColorPicker ? "bg-white text-dark-900 border-white" : "bg-dark-700 text-slate-400 border-border-dark hover:text-white"}`}>
                        <Type className="h-3 w-3" />
                        <span className="h-1 w-4 mt-0.5 border border-border-dark rounded-none" style={{ background: selBlock?.color ?? "#ffffff" }} />
                      </button>
                      {showTextColorPicker && (
                        <div className="absolute top-full left-0 mt-1 z-50 border border-border-dark bg-dark-900 p-3 shadow-xl w-[260px]">
                          <p className="text-[11px] tracking-widest text-slate-500 mb-2">TEXT COLOR</p>
                          <div className="grid grid-cols-10 gap-1">
                            {GOOGLE_COLORS.map(c=> (
                              <button key={c} onClick={()=> { if (selBlock) updateBlock(selBlock.id, { color: c }); setColorHistory(prev => [c, ...prev.filter(x=> x!==c)].slice(0,6)); setShowTextColorPicker(false); }} className="h-6 w-6 border border-border-dark hover:scale-110 hover:border-white transition-all rounded-none" style={{ background: c }} title={c} />
                            ))}
                          </div>
                          <div className="mt-3 pt-2 border-t border-border-dark flex items-center gap-2">
                            <input type="color" value={selBlock?.color ?? "#ffffff"} onChange={e=> { const col = e.target.value; if (selBlock) updateBlock(selBlock.id, { color: col }); setColorHistory(prev => [col, ...prev.filter(x=> x!==col)].slice(0,6)); }} className="h-6 w-6 border border-border-dark bg-transparent p-0 cursor-pointer rounded-none" />
                            <span className="text-[11px] text-slate-500">Custom</span>
                            <button onClick={()=> { if (selBlock) updateBlock(selBlock.id, { color: "#ffffff" }); setShowTextColorPicker(false); }} className="ml-auto text-[11px] text-slate-400 hover:text-white border border-border-dark px-2 py-1">Reset</button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="relative">
                      <button onClick={()=> { setShowHighlightPicker(v=> !v); setShowTextColorPicker(false); }} title="Highlight color" className={`w-7 h-7 flex flex-col items-center justify-center border rounded-none ${showHighlightPicker ? "bg-white text-dark-900 border-white" : "bg-dark-700 text-slate-400 border-border-dark hover:text-white"}`}>
                        <Highlighter className="h-3 w-3" />
                        <span className="h-1 w-4 mt-0.5 border border-border-dark rounded-none" style={{ background: selBlock?.highlightColor ?? "transparent" }} />
                      </button>
                      {showHighlightPicker && (
                        <div className="absolute top-full left-0 mt-1 z-50 border border-border-dark bg-dark-900 p-3 shadow-xl w-[260px]">
                          <p className="text-[11px] tracking-widest text-slate-500 mb-2">HIGHLIGHT COLOR</p>
                          <div className="grid grid-cols-10 gap-1">
                            {GOOGLE_COLORS.map(c=> (
                              <button key={c} onClick={()=> { if (selBlock) updateBlock(selBlock.id, { highlightColor: c }); setShowHighlightPicker(false); }} className="h-6 w-6 border border-border-dark hover:scale-110 hover:border-white transition-all rounded-none" style={{ background: c }} title={c} />
                            ))}
                            <button onClick={()=> { if (selBlock) updateBlock(selBlock.id, { highlightColor: undefined }); setShowHighlightPicker(false); }} className="h-6 w-6 border border-dashed border-border-dark bg-transparent flex items-center justify-center text-[10px] text-slate-500 hover:text-white" title="None">Ø</button>
                          </div>
                          <div className="mt-3 pt-2 border-t border-border-dark flex items-center gap-2">
                            <input type="color" value={selBlock?.highlightColor ?? "#ffff00"} onChange={e=> { const col = e.target.value; if (selBlock) updateBlock(selBlock.id, { highlightColor: col }); }} className="h-6 w-6 border border-border-dark bg-transparent p-0 cursor-pointer rounded-none" />
                            <span className="text-[11px] text-slate-500">Custom</span>
                            <button onClick={()=> { if (selBlock) updateBlock(selBlock.id, { highlightColor: undefined }); setShowHighlightPicker(false); }} className="ml-auto text-[11px] text-slate-400 hover:text-white border border-border-dark px-2 py-1">None</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3" style={{ scrollbarWidth: "thin" }}>
                  {blocks.map(block=> {
                    const isSel = selectedBlock===block.id;
                    const numericSize = block.fontSize?.match(/^\d+$/) ? `${block.fontSize}px` : undefined;
                    const style: React.CSSProperties = {
                      fontFamily: block.fontFamily === "Geist Mono" ? "Geist Mono, monospace" : block.fontFamily === "Geist Sans" ? "var(--font-geist-sans)" : block.fontFamily === "Inter" ? "Inter, sans-serif" : block.fontFamily === "Serif" ? "serif" : block.fontFamily === "Times New Roman" ? "Times New Roman, serif" : block.fontFamily === "Arial" ? "Arial, sans-serif" : block.fontFamily === "Roboto" ? "Roboto, sans-serif" : "Times New Roman, serif",
                      fontSize: numericSize ?? (block.fontSize==="Small" ? "12px" : block.fontSize==="Large" ? "16px" : block.fontSize==="H1" ? "22px" : block.fontSize==="H2" ? "18px" : block.fontSize==="H3" ? "16px" : "14px"),
                      fontWeight: block.bold ? 700 : undefined,
                      fontStyle: block.italic ? "italic" : undefined,
                      textDecoration: block.strike ? "underline" : block.codeInline ? "none" : undefined,
                      color: block.color,
                      background: block.codeInline ? "#0c121c" : block.highlightColor ? block.highlightColor : undefined,
                      padding: block.codeInline || block.highlightColor ? "0 4px" : undefined,
                    };
                    return (
                      <div key={block.id} data-block-id={block.id} draggable={false} onDragStart={(e)=> { setDraggedBlock(block.id); const el = e.currentTarget as HTMLElement; if (e.dataTransfer) { e.dataTransfer.effectAllowed='move'; try { e.dataTransfer.setDragImage(el, 20, 20); } catch {} } }} onDragEnd={()=> setDraggedBlock(null)} onDragOver={e=> e.preventDefault()} onDrop={e=> {
                        e.preventDefault();
                        if (!draggedBlock || draggedBlock===block.id) return;
                        const fromIdx = blocks.findIndex(b=> b.id===draggedBlock);
                        const toIdx = blocks.findIndex(b=> b.id===block.id);
                        if (fromIdx===-1 || toIdx===-1) return;
                        const arr=[...blocks]; const [moved]=arr.splice(fromIdx,1); arr.splice(toIdx,0,moved);
                        setBlocks(arr);
                        setDraggedBlock(null);
                        if (selectedId) fetch(`/api/documents/${selectedId}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ content: JSON.stringify(arr) }) });
                      }} onClick={()=> setSelectedBlock(block.id)} className={`group flex gap-2 p-1 ${isSel ? "border border-cyan-400/30 bg-dark-900/30" : "border border-transparent"} ${draggedBlock===block.id ? "opacity-40" : ""}`}>
                        <div className="flex flex-col gap-1 pt-1 opacity-0 group-hover:opacity-100 shrink-0">
                          <div draggable={true} onDragStart={(e)=> { e.stopPropagation(); setDraggedBlock(block.id); const blockEl = (e.currentTarget as HTMLElement).closest('[data-block-id]') as HTMLElement; if (blockEl && e.dataTransfer) { e.dataTransfer.effectAllowed='move'; try { e.dataTransfer.setData('text/plain', block.id); e.dataTransfer.setDragImage(blockEl, 20, 20); } catch {} if (blockEl) blockEl.style.opacity = '0.6'; } }} onDragEnd={(e)=> { setDraggedBlock(null); const blockEl = (e.currentTarget as HTMLElement).closest('[data-block-id]') as HTMLElement; if (blockEl) blockEl.style.opacity = ''; }} className="flex items-center justify-center w-5 h-5 border border-border-dark bg-dark-900 cursor-grab active:cursor-grabbing">
                            <LayoutGrid className="h-3 w-3 text-slate-500" />
                          </div>
                          <button onClick={()=> removeBlock(block.id)} className="border border-border-dark bg-dark-900 p-1 text-slate-500 hover:text-accent-red"><Trash2 className="h-3 w-3" /></button>
                        </div>
                        {block.type==="heading" || block.type==="heading1" ? (
                          <textarea ref={autoResize} value={block.text} onChange={e=> { updateBlock(block.id, { text: e.target.value }); autoResize(e.target as HTMLTextAreaElement); }} onInput={e=> autoResize(e.target as HTMLTextAreaElement)} onKeyDown={e=> { if(e.key==="Enter" && e.shiftKey){ e.preventDefault(); addBlock(block.id); } }} rows={1} placeholder="Heading..." className="flex-1 resize-none bg-transparent text-lg font-bold text-white placeholder:text-slate-600 focus:outline-none py-1 break-words whitespace-pre-wrap overflow-hidden" style={{ ...style, overflowWrap: "anywhere", wordBreak: "break-word" }} />
                        ) : block.type==="heading2" ? (
                          <textarea ref={autoResize} value={block.text} onChange={e=> { updateBlock(block.id, { text: e.target.value }); autoResize(e.target as HTMLTextAreaElement); }} onInput={e=> autoResize(e.target as HTMLTextAreaElement)} rows={1} placeholder="Heading 2" className="flex-1 resize-none bg-transparent text-lg font-bold text-white placeholder:text-slate-600 focus:outline-none py-1 break-words whitespace-pre-wrap overflow-hidden" style={{ ...style, overflowWrap: "anywhere", wordBreak: "break-word" }} />
                        ) : block.type==="heading3" ? (
                          <textarea ref={autoResize} value={block.text} onChange={e=> { updateBlock(block.id, { text: e.target.value }); autoResize(e.target as HTMLTextAreaElement); }} onInput={e=> autoResize(e.target as HTMLTextAreaElement)} rows={1} placeholder="Heading 3" className="flex-1 resize-none bg-transparent text-base font-bold text-white placeholder:text-slate-600 focus:outline-none py-1 break-words whitespace-pre-wrap overflow-hidden" style={{ ...style, overflowWrap: "anywhere", wordBreak: "break-word" }} />
                        ) : block.type==="code" ? (
                          <textarea ref={autoResize} value={block.text} onChange={e=> { updateBlock(block.id, { text: e.target.value }); autoResize(e.target as HTMLTextAreaElement); }} onInput={e=> autoResize(e.target as HTMLTextAreaElement)} onKeyDown={e=> { if(e.key==="Enter" && e.shiftKey){ e.preventDefault(); addBlock(block.id); } }} rows={1} className="flex-1 border border-border-dark bg-dark-900 px-3 py-2 text-xs text-slate-300 break-words whitespace-pre-wrap overflow-hidden" style={{ ...style, overflowWrap: "anywhere", wordBreak: "break-word" }} placeholder="Code..." />
                        ) : block.type==="bullet" || block.type==="numbered" ? (
                          <div className="flex-1 flex gap-2 items-start">
                            <span className="pt-2 text-slate-500">{block.type==="numbered" ? `${blocks.filter(b=>b.type==="numbered").indexOf(block)+1}.` : "•"}</span>
                            <textarea ref={autoResize} value={block.text} onChange={e=> { updateBlock(block.id, { text: e.target.value }); autoResize(e.target as HTMLTextAreaElement); }} onInput={e=> autoResize(e.target as HTMLTextAreaElement)} onKeyDown={e=> {
                              if(e.key==="Enter"){
                                e.preventDefault();
                                if(block.text.trim()===""){ updateBlock(block.id, { type: "paragraph", text: "" }); }
                                else { const nb: Block = { id: Math.random().toString(36).slice(2,8), type: block.type, text: "", fontFamily: block.fontFamily, fontSize: block.fontSize }; const idx=blocks.findIndex(b=>b.id===block.id); const copy=[...blocks]; copy.splice(idx+1,0,nb); setBlocks(copy); setSelectedBlock(nb.id); }
                              }
                            }} rows={1} className="flex-1 resize-none bg-transparent text-sm placeholder:text-slate-600 focus:outline-none py-1 break-words whitespace-pre-wrap overflow-hidden" style={{ ...style, overflowWrap: "anywhere", wordBreak: "break-word" }} placeholder={block.type==="numbered" ? "Numbered (Enter: new item, empty Enter: exit)" : "Bullet (Enter: new bullet, empty Enter: exit)"} />
                          </div>
                        ) : (block as Block).type==="todo" ? (
                          <div className="flex-1 flex gap-2 items-start">
                            <label className="pt-1 flex items-center cursor-pointer">
                              <input type="checkbox" checked={(block as { checked?: boolean }).checked ?? false} onChange={e=> updateBlock(block.id, { checked: e.target.checked } as Partial<Block>)} className="sr-only" />
                              {(block as { checked?: boolean }).checked ? (
                                <span className="w-4 h-4 bg-[#092318] border border-emerald-500 text-emerald-400 rounded-none flex items-center justify-center"><Check className="h-3 w-3 text-emerald-400" /></span>
                              ) : (
                                <span className="w-4 h-4 bg-[#070b11] border border-[#1e293b] rounded-none cursor-pointer hover:border-cyan-400"></span>
                              )}
                            </label>
                            <textarea ref={autoResize} value={block.text} onChange={e=> { updateBlock(block.id, { text: e.target.value }); autoResize(e.target as HTMLTextAreaElement); }} onInput={e=> autoResize(e.target as HTMLTextAreaElement)} onKeyDown={e=> {
                              if(e.key==="Enter"){
                                e.preventDefault();
                                if(block.text.trim()===""){ updateBlock(block.id, { type: "paragraph", text: "" }); }
                                else { const nb: Block = { id: Math.random().toString(36).slice(2,8), type: "todo", text: "", checked: false, fontFamily: block.fontFamily, fontSize: block.fontSize }; const idx=blocks.findIndex(b=>b.id===block.id); const copy=[...blocks]; copy.splice(idx+1,0,nb); setBlocks(copy); setSelectedBlock(nb.id); }
                              }
                            }} rows={1} className={`flex-1 resize-none bg-transparent text-sm placeholder:text-slate-600 focus:outline-none py-1 break-words whitespace-pre-wrap overflow-hidden ${(block as { checked?: boolean }).checked ? "line-through text-slate-600 transition-colors" : "text-slate-300"}`} style={{ ...style, overflowWrap: "anywhere", wordBreak: "break-word" }} placeholder="To-do (Enter: new row, empty Enter: exit)" />
                          </div>
                        ) : (
                          <textarea
                            ref={autoResize}
                            value={block.text}
                            onChange={e=> { updateBlock(block.id, { text: e.target.value }); autoResize(e.target as HTMLTextAreaElement); }}
                            onInput={e=> autoResize(e.target as HTMLTextAreaElement)}
                            onKeyDown={e=> {
                              if (e.key==="Enter" && !e.shiftKey) return;
                              if (e.key==="Enter" && e.shiftKey) { e.preventDefault(); addBlock(block.id); }
                            }}
                            rows={1}
                            className="flex-1 resize-none bg-transparent text-sm placeholder:text-slate-600 focus:outline-none py-1 break-words whitespace-pre-wrap overflow-hidden"
                            style={{ ...style, overflowWrap: "anywhere", wordBreak: "break-word" }}
                            placeholder="Write... (Enter: new line, Shift+Enter: new block)"
                          />
                        )}
                      </div>
                    );
                  })}
                  <button onClick={()=> addBlock()} className="mt-2 flex items-center gap-1 border border-dashed border-border-dark px-3 py-2 text-xs text-slate-500 hover:text-slate-300"> <Plus className="h-3.5 w-3.5" /> Add block </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {activeTab === "gallery" && (
        <div className="mt-4" style={{ height: "calc(100vh - 180px)", minHeight: 750 }}>
          <div className="border border-border-dark bg-dark-700 p-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold tracking-[0.12em] text-white">Workspace Gallery</h2>
              <p className="mt-1 text-xs text-slate-500">Private Project Planning &amp; Document Canvases</p>
            </div>
            {selectedCard && galleryEditMode && (
              <span className="flex items-center gap-1.5 text-[11px] tracking-widest shrink-0">
                {cardSaveStatus==="syncing" && <span className="flex items-center gap-1 text-slate-400"><Loader2 className="h-3 w-3 animate-spin" /> Saving...</span>}
                {cardSaveStatus==="saved" && <span className="flex items-center gap-1 text-slate-500"><Check className="h-3 w-3" /> Saved</span>}
                {cardSaveStatus==="idle" && <span className="text-slate-600">Idle</span>}
              </span>
            )}
          </div>

          {!selectedCard ? (
            <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto" style={{ maxHeight: "calc(100vh - 340px)", scrollbarWidth: "thin" }}>
              {cards.map(c=> {
                let tags: string[]=[]; try{ tags=JSON.parse(c.tags);}catch{}
                const IconComp = ICON_MAP[c.icon] || FileText;
                return (
                  <div key={c.id} onClick={()=> setSelectedCard(c)} className="border border-border-dark bg-dark-700 p-4 flex flex-col group cursor-pointer hover:border-border-light transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center border border-border-dark shrink-0" style={{ background: c.iconColor }}><IconComp className="h-3.5 w-3.5 text-white" /></div>
                      <span className={`px-2 py-0.5 text-[11px] tracking-widest ${statusBadgeClass(c.status)}`}>{c.status}</span>
                      <span className="ml-auto flex gap-1" onClick={e=> e.stopPropagation()}>
                        <button onClick={()=> setSelectedCard(c)} className="border border-border-dark bg-dark-900 px-2 py-1 text-[11px] text-slate-400 hover:text-white hover:border-cyan-400">Edit</button>
                        <button onClick={()=> deleteCard(c.id)} className="border border-border-dark bg-dark-900 p-1 text-slate-500 hover:text-accent-red"><Trash2 className="h-3 w-3" /></button>
                      </span>
                    </div>
                    <h3 className="mt-3 text-sm font-bold" style={{ color: c.titleColor }}>{c.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed line-clamp-3" style={{ color: c.summaryColor }}>{c.description}</p>
                    <div className="mt-2 flex flex-wrap gap-1">{tags.map(t=> <span key={t} className="border border-border-dark bg-dark-900 px-1.5 py-0.5 text-[11px] text-slate-500">{t}</span>)}</div>
                  </div>
                );
              })}
              <button onClick={async()=> { const res=await fetch("/api/workspace-cards",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ title: "Untitled Card"})}); const d=await res.json(); if(d.card) setCards(p=>[...p,d.card]); }} className="border border-dashed border-border-dark bg-dark-700/50 p-6 flex flex-col items-center justify-center gap-3 hover:border-border-light min-h-[180px]">
                <span className="flex h-8 w-8 items-center justify-center border border-border-dark bg-dark-900"><Plus className="h-4 w-4 text-slate-400" /></span>
                <span className="text-xs font-bold tracking-widest text-slate-400">+ NEW CARD</span>
              </button>
              {cards.length===0 && <div className="border border-border-dark bg-dark-700 p-6 text-xs text-slate-500 col-span-full">No cards — create one.</div>}
            </div>
          ) : (
            <div className="mt-4 overflow-y-auto" style={{ maxHeight: "calc(100vh - 260px)", scrollbarWidth: "thin" }}>
              <div className="max-w-[900px] mx-auto space-y-4">
                <div className="flex items-center justify-between border border-border-dark bg-dark-900 px-4 py-2">
                  <button onClick={()=> setSelectedCard(null)} className="text-xs tracking-widest text-slate-400 hover:text-white flex items-center gap-1"><ArrowLeft className="h-3 w-3" /> Back to Gallery</button>
                  <button onClick={()=> setGalleryEditMode(v=> !v)} className={`border px-3 py-1 text-xs tracking-widest ${galleryEditMode ? "bg-white text-dark-900 border-white" : "bg-dark-700 text-slate-300 border-border-dark"}`}>{galleryEditMode ? "View Mode" : "Edit Mode"}</button>
                </div>
                <div className="h-24 border border-border-dark" style={{ background: selectedCard?.iconColor ?? "#0c121c" }} />
                <div className="border border-border-dark bg-dark-700 p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center border border-border-dark shrink-0" style={{ background: selectedCard?.iconColor ?? "#0c121c" }}>
                      <RenderIcon name={selectedCard?.icon ?? "FileText"} className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      {galleryEditMode ? (
                        <input value={selectedCard?.title ?? ""} onChange={e=> { if (!selectedCard) return; setSelectedCard({ ...selectedCard, title: e.target.value }); }} onBlur={async ()=> { if (!selectedCard) return; const current = selectedCard; await fetch(`/api/workspace-cards/${current.id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ title: current.title }) }); setCards(prev=> prev.map(x=> x.id===current.id ? current : x)); }} className="w-full bg-transparent text-xl font-bold text-white focus:outline-none border-b border-border-dark pb-1" />
                      ) : (
                        <h1 className="text-xl font-bold" style={{ color: selectedCard?.titleColor ?? "#ffffff" }}>{selectedCard?.title ?? ""}</h1>
                      )}
                      <div className="mt-2 flex flex-wrap gap-2 items-center">
                        <span className={`border px-2 py-1 text-xs ${statusBadgeClass(selectedCard?.status ?? "Concept")}`}>{selectedCard?.status ?? "Concept"}</span>
                        {galleryEditMode && (
                          <select value={selectedCard?.status ?? "Concept"} onChange={e=> { if (!selectedCard) return; setSelectedCard({ ...selectedCard, status: e.target.value }); }} onBlur={async ()=> { if (!selectedCard) return; const current = selectedCard; await fetch(`/api/workspace-cards/${current.id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ status: current.status }) }); setCards(prev=> prev.map(x=> x.id===current.id ? current : x)); }} className="border border-border-dark bg-dark-900 px-2 py-1 text-xs text-white">
                            <option>Concept</option><option>In Development</option><option>Active</option><option>Archived</option>
                          </select>
                        )}
                        {galleryEditMode ? (
                          <>
                            <select value={selectedCard?.icon ?? "FileText"} onChange={e=> { if (!selectedCard) return; setSelectedCard({ ...selectedCard, icon: e.target.value }); }} onBlur={async ()=> { if (!selectedCard) return; const current = selectedCard; await fetch(`/api/workspace-cards/${current.id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ icon: current.icon }) }); setCards(prev=> prev.map(x=> x.id===current.id ? current : x)); }} className="border border-border-dark bg-dark-900 px-2 py-1 text-xs text-white">
                              {ICON_OPTIONS.map(o=> <option key={o} value={o}>{o}</option>)}
                            </select>
                            <input value={selectedCard?.iconColor ?? ""} onChange={e=> { if (!selectedCard) return; setSelectedCard({ ...selectedCard, iconColor: e.target.value }); }} onBlur={async ()=> { if (!selectedCard) return; const current = selectedCard; await fetch(`/api/workspace-cards/${current.id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ iconColor: current.iconColor }) }); setCards(prev=> prev.map(x=> x.id===current.id ? current : x)); }} placeholder="linear-gradient(135deg, #00f0ff, #4338ca)" className="border border-border-dark bg-dark-900 px-2 py-1 text-xs text-white flex-1 min-w-[160px]" />
                          </>
                        ) : (
                          <span className="text-xs text-slate-500">{(() => { try{ return JSON.parse(selectedCard?.tags ?? "[]").join(", "); } catch{ return ""; }})()}</span>
                        )}
                      </div>
                      {galleryEditMode ? (
                        <textarea value={selectedCard?.description ?? ""} onChange={e=> { if (!selectedCard) return; setSelectedCard({ ...selectedCard, description: e.target.value }); }} onBlur={async ()=> { if (!selectedCard) return; const current = selectedCard; await fetch(`/api/workspace-cards/${current.id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ description: current.description }) }); setCards(prev=> prev.map(x=> x.id===current.id ? current : x)); }} rows={2} placeholder="Description" className="mt-3 w-full border border-border-dark bg-dark-900 p-2 text-xs text-slate-300" />
                      ) : (
                        <p className="mt-3 text-sm leading-relaxed" style={{ color: selectedCard?.summaryColor ?? "#94a3b8" }}>{selectedCard?.description ?? ""}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border border-border-dark bg-dark-700 p-4 sm:p-6 space-y-3">
                  {galleryEditMode && (
                    <div className="flex flex-wrap gap-1.5 pb-3 border-b border-border-dark">
                      <span className="text-[11px] tracking-widest text-slate-500 py-1">+ Add Block:</span>
                      {[
                        ["paragraph","Text"], ["heading1","H1"], ["heading2","H2"], ["heading3","H3"], ["bullet","Bullet"], ["numbered","Numbered"], ["todo","To-do"], ["code","Code"], ["image","Media"]
                      ].map(([t,label])=> (
                        <button key={t} onClick={()=> setCardBlocks(prev=> [...prev, { id: Date.now().toString(36), type: t as Block["type"], text: t==="todo" ? "" : "", checked: false, fontFamily: "Times New Roman", fontSize: "11" } as Block])} className="border border-border-dark bg-dark-900 px-2 py-1 text-xs text-slate-300 hover:text-white">{label}</button>
                      ))}
                    </div>
                  )}

                  {cardBlocks.map(b=> (
                    <div key={b.id} data-block-id={b.id} draggable={false} onDragStart={(e)=> { if (!galleryEditMode) return; setDraggedBlock(b.id); const el = e.currentTarget as HTMLElement; if (e.dataTransfer) { e.dataTransfer.effectAllowed='move'; try { e.dataTransfer.setDragImage(el, 20, 20); } catch {} } }} onDragEnd={()=> setDraggedBlock(null)} onDragOver={e=> galleryEditMode && e.preventDefault()} onDrop={e=> {
                      if (!galleryEditMode) return;
                      e.preventDefault();
                      if (!draggedBlock || draggedBlock===b.id) return;
                      const fromIdx = cardBlocks.findIndex(x=> x.id===draggedBlock);
                      const toIdx = cardBlocks.findIndex(x=> x.id===b.id);
                      if (fromIdx===-1 || toIdx===-1) return;
                      const arr=[...cardBlocks]; const [m]=arr.splice(fromIdx,1); arr.splice(toIdx,0,m); setCardBlocks(arr); setDraggedBlock(null);
                    }} className={`group flex ${b.type==="todo"||b.type==="bullet"||b.type==="numbered" ? "gap-1 py-0.5" : "gap-2"} ${draggedBlock===b.id ? "opacity-40" : ""}`}>
                      {galleryEditMode && (
                        <div className="flex flex-col gap-1 pt-1 opacity-0 group-hover:opacity-100">
                          <div draggable={galleryEditMode} onDragStart={(e)=> { e.stopPropagation(); setDraggedBlock(b.id); const blockEl = (e.currentTarget as HTMLElement).closest('[data-block-id]') as HTMLElement; if (blockEl && e.dataTransfer) { e.dataTransfer.effectAllowed='move'; try { e.dataTransfer.setData('text/plain', b.id); e.dataTransfer.setDragImage(blockEl, 20, 20); } catch {} if (blockEl) blockEl.style.opacity='0.6'; } }} onDragEnd={(e)=> { setDraggedBlock(null); const blockEl = (e.currentTarget as HTMLElement).closest('[data-block-id]') as HTMLElement; if (blockEl) blockEl.style.opacity=''; }} className="flex items-center justify-center w-5 h-5 border border-border-dark bg-dark-900 cursor-grab active:cursor-grabbing"><LayoutGrid className="h-3 w-3 text-slate-500" /></div>
                          <button onClick={()=> setCardBlocks(prev=> prev.filter(x=> x.id!==b.id))} className="border border-border-dark bg-dark-900 p-1 text-slate-500 hover:text-accent-red"><Trash2 className="h-3 w-3" /></button>
                        </div>
                      )}
                      <div className="flex-1">
                        {b.type==="code" ? (
                          galleryEditMode ? <textarea value={b.text} onChange={e=> setCardBlocks(prev=> prev.map(x=> x.id===b.id ? { ...x, text: e.target.value } : x))} rows={3} className="w-full border border-border-dark bg-dark-900 p-2 text-xs text-slate-300" placeholder="Code..." /> : <pre className="border border-border-dark bg-dark-900 p-3 text-xs text-slate-300 whitespace-pre-wrap">{b.text}</pre>
                        ) : b.type==="image" ? <div>{galleryEditMode && <input value={(b as unknown as { url: string }).url ?? b.text} onChange={e=> setCardBlocks(prev=> prev.map(x=> x.id===b.id ? { ...x, url: e.target.value, text: e.target.value } as Block : x))} placeholder="https:// image or YouTube URL" className="w-full border border-border-dark bg-dark-900 px-2 py-1 text-xs text-white" />}{(() => {
                           const url = (b as unknown as { url: string }).url ?? b.text;
                           const embed = url ? toEmbedUrl(url) : null;
                           if (embed) return <div className="w-full aspect-video border border-border-dark bg-dark-900 my-2 overflow-hidden"><iframe src={embed} className="w-full h-full aspect-video border-none" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="media" /></div>;
                           if (url && url.match(/\.(mp4|webm)$/)) return <video src={url} controls className="w-full max-h-[360px] border border-border-dark mt-1" />;
                           if (url) return <img src={url} alt="" className="w-full max-h-[360px] object-contain border border-border-dark bg-dark-900 mt-1" />;
                           return galleryEditMode ? null : <p className="text-xs text-slate-600">No media</p>;
                         })()}</div> :
                          b.type==="todo" ? <div className="flex gap-1 items-start"><label className="pt-0.5 flex items-center cursor-pointer"><input type="checkbox" checked={(b as unknown as { checked: boolean }).checked ?? false} onChange={e=> setCardBlocks(prev=> prev.map(x=> x.id===b.id ? { ...x, checked: e.target.checked } as Block : x))} className="sr-only" />{(b as unknown as { checked: boolean }).checked ? (<span className="w-4 h-4 bg-[#092318] border border-emerald-500 text-emerald-400 rounded-none flex items-center justify-center"><Check className="h-3 w-3 text-emerald-400" /></span>) : (<span className="w-4 h-4 bg-[#070b11] border border-[#1e293b] rounded-none cursor-pointer hover:border-cyan-400"></span> )}</label><textarea value={b.text} onChange={e=> galleryEditMode ? setCardBlocks(prev=> prev.map(x=> x.id===b.id ? { ...x, text: e.target.value } : x)) : undefined} readOnly={!galleryEditMode} rows={1} className={`flex-1 bg-transparent text-sm focus:outline-none break-words whitespace-pre-wrap ${ (b as unknown as { checked: boolean }).checked ? "line-through text-slate-600 transition-colors" : "text-slate-300"}`} placeholder="To-do" onKeyDown={galleryEditMode ? e=> {
                           if(e.key==="Enter"){
                             e.preventDefault();
                             if(b.text.trim()===""){ setCardBlocks(prev=> prev.map(x=> x.id===b.id ? { ...x, type: "paragraph" as Block["type"] } as Block : x)); }
                             else { const nb: Block = { id: Math.random().toString(36).slice(2,8), type: "todo", text: "", checked: false }; const idx=cardBlocks.findIndex(x=> x.id===b.id); const copy=[...cardBlocks]; copy.splice(idx+1,0,nb); setCardBlocks(copy); }
                           }
                         } : undefined} /></div> :
                         b.type==="bullet" ? (galleryEditMode ? <div className="flex gap-1"><span className="pt-0.5 text-slate-500">•</span><input value={b.text} onChange={e=> setCardBlocks(prev=> prev.map(x=> x.id===b.id ? { ...x, text: e.target.value } : x))} onKeyDown={e=> { if(e.key==="Enter"){ e.preventDefault(); if(b.text.trim()===""){ setCardBlocks(prev=> prev.map(x=> x.id===b.id ? { ...x, type: "paragraph" } as Block : x)); } else { const nb: Block = { id: Math.random().toString(36).slice(2,8), type: "bullet", text: "" }; const idx=cardBlocks.findIndex(x=> x.id===b.id); const copy=[...cardBlocks]; copy.splice(idx+1,0,nb); setCardBlocks(copy); } } }} placeholder="Bullet point" className="flex-1 bg-transparent text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none py-0.5" /></div> : <li className="ml-4 list-disc py-0.5 text-sm text-slate-300">{b.text}</li>) :
                         b.type==="numbered" ? (galleryEditMode ? <div className="flex gap-1"><span className="pt-0.5 text-slate-500">{cardBlocks.filter(x=> x.type==="numbered").indexOf(b)+1}.</span><input value={b.text} onChange={e=> setCardBlocks(prev=> prev.map(x=> x.id===b.id ? { ...x, text: e.target.value } : x))} onKeyDown={e=> { if(e.key==="Enter"){ e.preventDefault(); if(b.text.trim()===""){ setCardBlocks(prev=> prev.map(x=> x.id===b.id ? { ...x, type: "paragraph" } as Block : x)); } else { const nb: Block = { id: Math.random().toString(36).slice(2,8), type: "numbered", text: "" }; const idx=cardBlocks.findIndex(x=> x.id===b.id); const copy=[...cardBlocks]; copy.splice(idx+1,0,nb); setCardBlocks(copy); } } }} placeholder="Numbered item" className="flex-1 bg-transparent text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none py-0.5" /></div> : <div className="py-0.5 text-sm text-slate-300">{cardBlocks.filter(x=> x.type==="numbered").indexOf(b)+1}. {b.text}</div>) :
                         b.type==="heading1" ? (galleryEditMode ? <input value={b.text} onChange={e=> setCardBlocks(prev=> prev.map(x=> x.id===b.id ? { ...x, text: e.target.value } : x))} placeholder="Heading 1" className="w-full bg-transparent text-2xl font-bold text-white placeholder:text-slate-600 focus:outline-none py-1" /> : <h1 className="py-1 text-2xl font-bold text-white">{b.text}</h1>) :
                         b.type==="heading2" ? (galleryEditMode ? <input value={b.text} onChange={e=> setCardBlocks(prev=> prev.map(x=> x.id===b.id ? { ...x, text: e.target.value } : x))} placeholder="Heading 2" className="w-full bg-transparent text-xl font-bold text-white placeholder:text-slate-600 focus:outline-none py-1" /> : <h2 className="py-1 text-xl font-bold text-white">{b.text}</h2>) :
                         b.type==="heading3" ? (galleryEditMode ? <input value={b.text} onChange={e=> setCardBlocks(prev=> prev.map(x=> x.id===b.id ? { ...x, text: e.target.value } : x))} placeholder="Heading 3" className="w-full bg-transparent text-lg font-bold text-white placeholder:text-slate-600 focus:outline-none py-1" /> : <h3 className="py-1 text-lg font-bold text-white">{b.text}</h3>) :
                         galleryEditMode ? <textarea value={b.text} onChange={e=> setCardBlocks(prev=> prev.map(x=> x.id===b.id ? { ...x, text: e.target.value } : x))} rows={1} className="w-full bg-transparent text-sm text-slate-300 focus:outline-none break-words whitespace-pre-wrap" placeholder="Text" /> : <p className="py-1 text-sm leading-relaxed text-slate-300 whitespace-pre-wrap">{b.text || <span className="text-slate-600">Empty</span>}</p>}
                      </div>
                    </div>
                  ))}
                  {galleryEditMode && cardBlocks.length===0 && <p className="text-xs text-slate-600 py-4">No blocks — add one above.</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "tasks" && (
        <div className="mt-4 grid lg:grid-cols-[1.1fr_0.9fr] gap-4" style={{ height: "calc(100vh - 180px)", minHeight: 750 }}>
          <div className="border border-border-dark bg-dark-700 p-4 flex flex-col overflow-hidden">
            <h2 className="text-xs font-bold tracking-[0.12em] text-white flex items-center gap-1.5"><ListTodo className="h-4 w-4" /> QUICK TASKS</h2>
            <div className="mt-3 flex gap-2">
              <input value={newTask} onChange={e=> setNewTask(e.target.value)} onKeyDown={e=> e.key==="Enter" && createTask()} placeholder="Add task..." className="flex-1 border border-border-dark bg-dark-900 px-3 py-2 text-xs text-white placeholder:text-slate-600" />
              <select value={newPriority} onChange={e=> setNewPriority(e.target.value)} className="border border-border-dark bg-dark-900 px-2 py-2 text-xs text-white">
                <option value="LOW">Low</option><option value="NORMAL">Normal</option><option value="HIGH">High</option><option value="URGENT">Urgent</option>
              </select>
              <button onClick={createTask} className="border border-border-dark bg-white px-3 text-dark-900"><Plus className="h-4 w-4" /></button>
            </div>
            <div className="mt-4 space-y-2 overflow-y-auto flex-1 pr-1" style={{ scrollbarWidth: "thin" }}>
              {tasks.map(t=> (
                <div key={t.id} className="flex items-center gap-2 border border-border-dark bg-dark-900 px-3 py-2">
                  <label className="flex items-center cursor-pointer">
                    <input type="checkbox" checked={t.completed} onChange={()=> toggleTask(t)} className="sr-only" />
                    {t.completed ? (
                      <span className="w-4 h-4 bg-[#092318] border border-emerald-500 text-emerald-400 rounded-none flex items-center justify-center"><Check className="h-3 w-3 text-emerald-400" /></span>
                    ) : (
                      <span className="w-4 h-4 bg-[#070b11] border border-[#1e293b] rounded-none cursor-pointer hover:border-cyan-400"></span>
                    )}
                  </label>
                  <span className={`flex-1 text-xs break-words whitespace-pre-wrap ${t.completed ? "line-through text-slate-600 transition-colors" : "text-slate-300"}`}>{t.title}</span>
                  <span className={`border px-1.5 py-0.5 text-[10px] tracking-widest ${t.priority==="URGENT" ? "border-accent-red/30 text-accent-red" : t.priority==="HIGH" ? "border-amber-500/30 text-amber-400" : "border-border-dark text-slate-500"}`}>{t.priority}</span>
                  <button onClick={()=> deleteTask(t.id)} className="text-slate-500 hover:text-accent-red"><Trash2 className="h-3 w-3" /></button>
                </div>
              ))}
              {tasks.length===0 && <p className="text-xs text-slate-600">No tasks yet.</p>}
            </div>
          </div>

          <div className="border border-border-dark bg-dark-700 p-4 flex flex-col overflow-hidden">
            <h2 className="text-xs font-bold tracking-[0.12em] text-white flex items-center gap-1.5"><StickyNote className="h-4 w-4" /> SCRATCHPAD</h2>
            <p className="mt-1 text-[11px] text-slate-600">Instant buffer — saved to localStorage.</p>
            <textarea value={scratchpad} onChange={e=> setScratchpad(e.target.value)} placeholder="Rapid idea capture..." className="mt-3 flex-1 border border-border-dark bg-dark-900 p-3 text-xs leading-relaxed text-slate-300 placeholder:text-slate-600 focus:outline-none break-words whitespace-pre-wrap overflow-hidden" />
            <div className="mt-3 flex gap-2">
              <button onClick={()=> { setScratchpad(""); localStorage.removeItem("hexcent_scratchpad"); }} className="border border-border-dark bg-dark-900 px-3 py-1.5 text-xs text-slate-400">CLEAR</button>
              <span className="ml-auto text-[11px] text-slate-600">{scratchpad.length} chars</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === "integration" && (
        <div className="mt-4 border border-border-dark bg-dark-900 p-6 page-fade-in" style={{ height: "calc(100vh - 180px)", minHeight: 750 }}>
          <h2 className="text-xs font-bold tracking-[0.12em] text-white">INTEGRATION</h2>
          <p className="mt-2 text-xs text-slate-500">Future telemetry hooks for local engines.</p>
          <div className="mt-6 grid sm:grid-cols-2 gap-4">
            <div className="border border-border-dark bg-dark-700 p-4 flex items-center justify-between">
              <span className="text-xs tracking-widest text-slate-500">Study-Agent Core</span>
              <span className="border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-xs text-amber-400">Disconnected</span>
            </div>
            <div className="border border-border-dark bg-dark-700 p-4 flex items-center justify-between">
              <span className="text-xs tracking-widest text-slate-500">Hexnet Engine Live Bridge</span>
              <span className="border border-border-dark bg-dark-900 px-2 py-1 text-xs text-slate-500">Standby</span>
            </div>
          </div>
          <div className="mt-6 border border-border-dark bg-dark-700 p-4 text-xs leading-relaxed text-slate-500">
            Placeholder canvas for WebSocket / Cloudflare Tunnel telemetry. No active connections.
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
