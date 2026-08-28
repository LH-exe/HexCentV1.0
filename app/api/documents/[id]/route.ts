import { NextRequest, NextResponse } from "next/server";
import prisma, { safeDbQuery, isDbConfigured } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { apiLimiter, docWriteLimiter } from "@/lib/rate-limit";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const { success } = await apiLimiter.limit(`doc:get:${ip}:${id}`);
  if (!success) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

  const session = await getSession();
  if (session?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }
  const doc = await safeDbQuery(() => prisma.document.findUnique({ where: { id } }), null);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ document: doc });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (session?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: admin required" }, { status: 403 });
  }
  const { id } = await params;
  const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const { success } = await docWriteLimiter.limit(`doc:patch:${ip}`);
  if (!success) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

  let body: { title?: string; content?: string; icon?: string; folderId?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isDbConfigured()) {
    return NextResponse.json({ document: { id, ...body, updatedAt: new Date().toISOString() }, fallback: true });
  }

  try {
    const doc = await prisma.document.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.content !== undefined && { content: body.content }),
        ...(body.icon !== undefined && { icon: body.icon }),
        ...(body.folderId !== undefined && { folderId: body.folderId }),
      },
    });
    return NextResponse.json({ document: doc });
  } catch (e: unknown) {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
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
