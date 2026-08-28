import { NextRequest, NextResponse } from "next/server";
import prisma, { isDbConfigured } from "@/lib/db";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (session?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  let body: { name?: string; color?: string; parentId?: string | null };
  try { body = await req.json(); } catch { body = {}; }
  if (!isDbConfigured()) return NextResponse.json({ folder: { id, ...body }, fallback: true });
  try {
    const folder = await prisma.folder.update({ where: { id }, data: { ...(body.name !== undefined && { name: body.name }), ...(body.color !== undefined && { color: body.color }), ...(body.parentId !== undefined && { parentId: body.parentId }) } });
    return NextResponse.json({ folder });
  } catch { return NextResponse.json({ error: "Not found" }, { status: 404 }); }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (session?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  if (!isDbConfigured()) return NextResponse.json({ ok: true, fallback: true });
  try { await prisma.folder.delete({ where: { id } }); return NextResponse.json({ ok: true }); }
  catch { return NextResponse.json({ error: "Not found" }, { status: 404 }); }
}
