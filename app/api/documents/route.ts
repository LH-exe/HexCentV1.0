import { NextRequest, NextResponse } from "next/server";
import prisma, { safeDbQuery, isDbConfigured } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { apiLimiter, docWriteLimiter } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const { success } = await apiLimiter.limit(`docs:get:${ip}`);
  if (!success) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const session = await getSession();
  if (session?.role !== "ADMIN") {
    return NextResponse.json({ documents: [] });
  }

  if (!isDbConfigured()) {
    return NextResponse.json({ documents: [], warning: "DB not configured — offline fallback active" });
  }

  const docs = await safeDbQuery(
    () =>
      prisma.document.findMany({
        orderBy: { updatedAt: "desc" },
        take: 100,
        select: {
          id: true,
          title: true,
          content: true,
          icon: true,
          folderId: true,
          userId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    []
  );

  return NextResponse.json({ documents: docs });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (session?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: admin required" }, { status: 403 });
  }
  const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const { success } = await docWriteLimiter.limit(`docs:post:${ip}`);
  if (!success) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  let body: { title?: string; content?: string; icon?: string; folderId?: string | null };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  if (!isDbConfigured()) {
    const mock = {
      id: `doc_${Date.now()}`,
      title: body.title ?? "Untitled Document",
      content: body.content ?? "[]",
      icon: body.icon ?? "📄",
      folderId: body.folderId ?? null,
      userId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return NextResponse.json({ document: mock, fallback: true }, { status: 201 });
  }

  try {
    const doc = await prisma.document.create({
      data: {
        title: body.title ?? "Untitled Document",
        content: body.content ?? "[]",
        icon: body.icon ?? "📄",
        folderId: body.folderId ?? null,
      },
    });
    return NextResponse.json({ document: doc }, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: "DB error", fallback: true }, { status: 500 });
  }
}
