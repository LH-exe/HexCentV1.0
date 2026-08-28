import { NextRequest, NextResponse } from "next/server";
import prisma, { isDbConfigured } from "@/lib/db";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  let project = null;
  if (isDbConfigured()) {
    project = await prisma.project.findUnique({ where: { id } });
    if (!project) project = await prisma.project.findUnique({ where: { slug: id } });
  }
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const session = await getSession();
  if (!project.isPublic && session?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ project });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (session?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  let body: { slug?: string; title?: string; description?: string; icon?: string; iconColor?: string; titleColor?: string; summaryColor?: string; status?: string; tags?: string; content?: string; isPublic?: boolean; order?: number };
  try { body = await req.json(); } catch { body = {}; }
  if (!isDbConfigured()) return NextResponse.json({ project: { id, ...body }, fallback: true });
  try {
    const project = await prisma.project.update({ where: { id }, data: { ...(body.slug !== undefined && { slug: body.slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-") }), ...(body.title !== undefined && { title: body.title }), ...(body.description !== undefined && { description: body.description }), ...(body.icon !== undefined && { icon: body.icon }), ...(body.iconColor !== undefined && { iconColor: body.iconColor }), ...(body.titleColor !== undefined && { titleColor: body.titleColor }), ...(body.summaryColor !== undefined && { summaryColor: body.summaryColor }), ...(body.status !== undefined && { status: body.status }), ...(body.tags !== undefined && { tags: body.tags }), ...(body.content !== undefined && { content: body.content }), ...(body.isPublic !== undefined && { isPublic: body.isPublic }), ...(body.order !== undefined && { order: body.order }) } });
    return NextResponse.json({ project });
  } catch { return NextResponse.json({ error: "Not found" }, { status: 404 }); }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (session?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  if (!isDbConfigured()) return NextResponse.json({ ok: true, fallback: true });
  try { await prisma.project.delete({ where: { id } }); return NextResponse.json({ ok: true }); }
  catch { return NextResponse.json({ error: "Not found" }, { status: 404 }); }
}
