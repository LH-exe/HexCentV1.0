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
  try {
    const { id } = await params;
    const session = await getSession();

    if (session?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const updateData: Record<string, any> = {};

    if (body.title !== undefined) updateData.title = String(body.title);
    if (body.description !== undefined) updateData.description = String(body.description);
    if (body.icon !== undefined) updateData.icon = String(body.icon);
    if (body.iconColor !== undefined) updateData.iconColor = String(body.iconColor);
    if (body.titleColor !== undefined) updateData.titleColor = String(body.titleColor);
    if (body.summaryColor !== undefined) updateData.summaryColor = String(body.summaryColor);
    if (body.status !== undefined) updateData.status = String(body.status);
    if (body.isPublic !== undefined) updateData.isPublic = Boolean(body.isPublic);
    if (body.order !== undefined) updateData.order = Number(body.order);
    if (body.slug !== undefined) updateData.slug = String(body.slug).trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-");

    if (body.tags !== undefined) {
      updateData.tags = typeof body.tags === "string" ? body.tags : JSON.stringify(body.tags);
    }

    // Strict AST Content Serialization Guard
    if (body.content !== undefined) {
      updateData.content = typeof body.content === "string"
        ? body.content
        : JSON.stringify(body.content);
    }

    if (!isDbConfigured()) return NextResponse.json({ project: { id, ...body, ...updateData }, fallback: true });

    // Resolve by ID or fallback to unique Slug (Prisma requires unique where)
    const where = id.startsWith("cm") || id.startsWith("c") ? { id } : { slug: id };
    let updatedProject;
    try {
      updatedProject = await prisma.project.update({
        where,
        data: updateData,
      });
    } catch (e) {
      // Fallback: try alternative key if first fails (covers cuid vs slug edge)
      if ((where as any).id) {
        updatedProject = await prisma.project.update({
          where: { slug: id },
          data: updateData,
        });
      } else {
        updatedProject = await prisma.project.update({
          where: { id },
          data: updateData,
        });
      }
    }

    return NextResponse.json({ ok: true, project: updatedProject });
  } catch (err) {
    console.error("[PATCH /api/projects/[id]] Error:", err);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (session?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  if (!isDbConfigured()) return NextResponse.json({ ok: true, fallback: true });
  try {
    // Try delete by id then slug
    try {
      await prisma.project.delete({ where: { id } });
    } catch {
      await prisma.project.delete({ where: { slug: id } });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
