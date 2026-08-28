import { NextRequest, NextResponse } from "next/server";
import prisma, { isDbConfigured } from "@/lib/db";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (session?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  let body: { title?: string; description?: string; icon?: string; iconColor?: string; titleColor?: string; summaryColor?: string; status?: string; tags?: string; content?: string };
  try { body = await req.json(); } catch { body = {}; }
  if (!isDbConfigured()) return NextResponse.json({ card: { id, ...body }, fallback: true });
  try {
    const card = await prisma.workspaceCard.update({ where: { id }, data: { ...(body.title !== undefined && { title: body.title }), ...(body.description !== undefined && { description: body.description }), ...(body.icon !== undefined && { icon: body.icon }), ...(body.iconColor !== undefined && { iconColor: body.iconColor }), ...(body.titleColor !== undefined && { titleColor: body.titleColor }), ...(body.summaryColor !== undefined && { summaryColor: body.summaryColor }), ...(body.status !== undefined && { status: body.status }), ...(body.tags !== undefined && { tags: body.tags }), ...(body.content !== undefined && { content: body.content }) } });
    return NextResponse.json({ card });
  } catch { return NextResponse.json({ error: "Not found" }, { status: 404 }); }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (session?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  if (!isDbConfigured()) return NextResponse.json({ ok: true, fallback: true });
  try { await prisma.workspaceCard.delete({ where: { id } }); return NextResponse.json({ ok: true }); }
  catch { return NextResponse.json({ error: "Not found" }, { status: 404 }); }
}
