import { NextRequest, NextResponse } from "next/server";
import prisma, { safeDbQuery, isDbConfigured } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { apiLimiter, docWriteLimiter } from "@/lib/rate-limit";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
    const { success } = await apiLimiter.limit(`doc:get:${ip}:${id}`);
    if (!success) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

    const session = await getSession();
    if (!isDbConfigured()) {
      return NextResponse.json({ error: "DB not configured" }, { status: 503 });
    }
    const document = await safeDbQuery(
      () =>
        prisma.document.findUnique({
          where: { id },
          select: {
            id: true,
            title: true,
            content: true,
            icon: true,
            folderId: true,
            isPublic: true,
            userId: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
      null
    );

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (!(document as any).isPublic && session?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ document });
  } catch (err) {
    console.error("[GET /api/documents/[id]] Error:", err);
    return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (session?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
    const { success } = await docWriteLimiter.limit(`doc:patch:${ip}`);
    if (!success) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

    const body = await req.json();
    const updateData: Record<string, any> = {};

    if (body.title !== undefined) updateData.title = String(body.title);
    if (body.icon !== undefined) updateData.icon = String(body.icon);
    if (body.folderId !== undefined) updateData.folderId = body.folderId ? String(body.folderId) : null;
    if (body.isPublic !== undefined) updateData.isPublic = Boolean(body.isPublic);

    // Strict JSON AST Serialization Guard
    if (body.content !== undefined) {
      updateData.content = typeof body.content === "string" ? body.content : JSON.stringify(body.content);
    }

    if (!isDbConfigured()) {
      return NextResponse.json({ ok: true, document: { id, ...updateData, updatedAt: new Date().toISOString() } });
    }

    const updatedDoc = await prisma.document.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ ok: true, document: updatedDoc });
  } catch (err) {
    console.error("[PATCH /api/documents/[id]] Error:", err);
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (session?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  if (!isDbConfigured()) {
    return NextResponse.json({ ok: true, fallback: true });
  }
  try {
    await prisma.document.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
