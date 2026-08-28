import { NextRequest, NextResponse } from "next/server";
import prisma, { safeDbQuery, isDbConfigured } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (session?.role !== "ADMIN") return NextResponse.json({ tasks: [] });
  if (!isDbConfigured()) return NextResponse.json({ tasks: [] });
  const tasks = await safeDbQuery(() => prisma.task.findMany({ orderBy: { createdAt: "desc" }, take: 100 }), []);
  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (session?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let body: { title?: string; priority?: string };
  try { body = await req.json(); } catch { body = {}; }
  if (!body.title || body.title.trim() === "") return NextResponse.json({ error: "Title required" }, { status: 400 });
  if (!isDbConfigured()) {
    const mock = { id: `task_${Date.now()}`, title: body.title.trim(), completed: false, priority: body.priority ?? "NORMAL", createdAt: new Date().toISOString() };
    return NextResponse.json({ task: mock, fallback: true }, { status: 201 });
  }
  const task = await prisma.task.create({ data: { title: body.title.trim(), priority: body.priority ?? "NORMAL" } });
  return NextResponse.json({ task }, { status: 201 });
}
