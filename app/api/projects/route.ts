import { NextRequest, NextResponse } from "next/server";
import prisma, { safeDbQuery, isDbConfigured } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { apiLimiter } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const { success } = await apiLimiter.limit(`projects:get:${ip}`);
  if (!success) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  const session = await getSession();
  const isAdmin = session?.role === "ADMIN";
  const headers: Record<string, string> = isAdmin
    ? { "Cache-Control": "no-store, max-age=0" }
    : {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        "CDN-Cache-Control": "public, s-maxage=60",
        "Vercel-CDN-Cache-Control": "public, s-maxage=60",
      };
  if (!isDbConfigured()) {
    const fallback = [
      { id: "fallback_hexnet", slug: "hexnet", title: "Hexnet — Quantitative Research Framework", description: "Python / PyQt6 / Numba. Multi-threaded backtesting, walk-forward, triple-barrier, Monte Carlo.", icon: "Activity", iconColor: "linear-gradient(135deg, #00f0ff, #4338ca)", titleColor: "#ffffff", summaryColor: "#94a3b8", status: "In Development", tags: JSON.stringify(["Python","PyQt6","Numba"]), content: "[]", isPublic: true, order: 0 },
    ];
    const filtered = isAdmin ? fallback : fallback.filter(p => p.isPublic);
    return NextResponse.json({ projects: filtered, fallback: true }, { headers });
  }
  const projects = await safeDbQuery(() => prisma.project.findMany({ orderBy: [{ order: "asc" }, { createdAt: "asc" }] }), []);
  const filtered = isAdmin ? projects : projects.filter((p: { isPublic: boolean }) => p.isPublic);
  return NextResponse.json({ projects: filtered }, { headers });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (session?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let body: { slug?: string; title?: string; description?: string; icon?: string; iconColor?: string; titleColor?: string; summaryColor?: string; status?: string; tags?: string; content?: string; isPublic?: boolean; order?: number };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!body.slug || !body.title) return NextResponse.json({ error: "slug and title required" }, { status: 400 });
  const slug = body.slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-");
  if (!isDbConfigured()) {
    const mock = { id: `proj_${Date.now()}`, slug, title: body.title, description: body.description ?? "Project summary...", icon: body.icon ?? "Folder", iconColor: body.iconColor ?? "linear-gradient(135deg, #00f0ff, #4338ca)", titleColor: body.titleColor ?? "#ffffff", summaryColor: body.summaryColor ?? "#94a3b8", status: body.status ?? "In Development", tags: body.tags ?? "[]", content: body.content ?? "[]", isPublic: body.isPublic ?? true, order: body.order ?? 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    return NextResponse.json({ project: mock, fallback: true }, { status: 201 });
  }
  try {
    const project = await prisma.project.create({ data: { slug, title: body.title, description: body.description ?? "Project summary...", icon: body.icon ?? "Folder", iconColor: body.iconColor ?? "linear-gradient(135deg, #00f0ff, #4338ca)", titleColor: body.titleColor ?? "#ffffff", summaryColor: body.summaryColor ?? "#94a3b8", status: body.status ?? "In Development", tags: body.tags ?? "[]", content: body.content ?? "[]", isPublic: body.isPublic ?? true, order: body.order ?? 0 } });
    return NextResponse.json({ project }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Unique constraint")) return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
