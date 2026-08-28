import { NextRequest, NextResponse } from "next/server";
import prisma, { safeDbQuery, isDbConfigured } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (session?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ projects: [] });
  const projects = await safeDbQuery(() => prisma.project.findMany({ orderBy: [{ order: "asc" }] }), []);
  return NextResponse.json({ projects });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (session?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let body: { slug?: string; title?: string; description?: string; icon?: string; iconColor?: string; titleColor?: string; summaryColor?: string; status?: string; tags?: string; content?: string; isPublic?: boolean; order?: number };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!body.slug || !body.title) return NextResponse.json({ error: "slug and title required" }, { status: 400 });
  const slug = body.slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-");
  if (!isDbConfigured()) {
    const mock = { id: `proj_${Date.now()}`, slug, title: body.title, description: body.description ?? "Project summary...", icon: body.icon ?? "Folder", iconColor: body.iconColor ?? "linear-gradient(135deg, #00f0ff, #4338ca)", titleColor: body.titleColor ?? "#ffffff", summaryColor: body.summaryColor ?? "#94a3b8", status: body.status ?? "In Development", tags: body.tags ?? "[]", content: body.content ?? "[]", isPublic: body.isPublic ?? true, order: body.order ?? 0 };
    return NextResponse.json({ project: mock, fallback: true }, { status: 201 });
  }
  const project = await prisma.project.create({ data: { slug, title: body.title, description: body.description ?? "Project summary...", icon: body.icon ?? "Folder", iconColor: body.iconColor ?? "linear-gradient(135deg, #00f0ff, #4338ca)", titleColor: body.titleColor ?? "#ffffff", summaryColor: body.summaryColor ?? "#94a3b8", status: body.status ?? "In Development", tags: body.tags ?? "[]", content: body.content ?? "[]", isPublic: body.isPublic ?? true, order: body.order ?? 0 } });
  return NextResponse.json({ project }, { status: 201 });
}
