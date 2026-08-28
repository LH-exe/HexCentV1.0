import { NextRequest, NextResponse } from "next/server";
import prisma, { safeDbQuery, isDbConfigured } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (session?.role !== "ADMIN") return NextResponse.json({ cards: [] });
  if (!isDbConfigured()) return NextResponse.json({ cards: [] });
  const cards = await safeDbQuery(() => prisma.workspaceCard.findMany({ orderBy: { createdAt: "asc" } }), []);
  return NextResponse.json({ cards });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (session?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let body: { title?: string; description?: string; icon?: string; iconColor?: string; titleColor?: string; summaryColor?: string; status?: string; tags?: string; content?: string };
  try { body = await req.json(); } catch { body = {}; }
  if (!isDbConfigured()) {
    const mock = { id: `wcard_${Date.now()}`, title: body.title ?? "Untitled Card", description: body.description ?? "Private notes & specs...", icon: body.icon ?? "FileText", iconColor: body.iconColor ?? "linear-gradient(135deg, #00f0ff, #4338ca)", titleColor: body.titleColor ?? "#ffffff", summaryColor: body.summaryColor ?? "#94a3b8", status: body.status ?? "Concept", tags: body.tags ?? "[]", content: body.content ?? "[]", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    return NextResponse.json({ card: mock, fallback: true }, { status: 201 });
  }
  const card = await prisma.workspaceCard.create({ data: { title: body.title ?? "Untitled Card", description: body.description ?? "Private notes & specs...", icon: body.icon ?? "FileText", iconColor: body.iconColor ?? "linear-gradient(135deg, #00f0ff, #4338ca)", titleColor: body.titleColor ?? "#ffffff", summaryColor: body.summaryColor ?? "#94a3b8", status: body.status ?? "Concept", tags: body.tags ?? "[]", content: body.content ?? "[]" } });
  return NextResponse.json({ card }, { status: 201 });
}
