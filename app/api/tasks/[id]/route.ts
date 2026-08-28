import { NextRequest, NextResponse } from "next/server";
import prisma, { isDbConfigured } from "@/lib/db";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (session?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  let body: { title?: string; completed?: boolean; priority?: string };
  try { body = await req.json(); } catch { body = {}; }
  if (!isDbConfigured()) return NextResponse.json({ task: { id, ...body }, fallback: true });
  try {
    const task = await prisma.task.update({ where: { id }, data: { ...(body.title !== undefined && { title: body.title }), ...(body.completed !== undefined && { completed: body.completed }), ...(body.priority !== undefined && { priority: body.priority }) } });
    return NextResponse.json({ task });
  } catch { return NextResponse.json({ error: "Not found" }, { status: 404 }); }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (session?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  if (!isDbConfigured()) return NextResponse.json({ ok: true, fallback: true });
  try { await prisma.task.delete({ where: { id } }); return NextResponse.json({ ok: true }); }
  catch { return NextResponse.json({ error: "Not found" }, { status: 404 }); }
}
