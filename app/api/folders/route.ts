import { NextRequest, NextResponse } from "next/server";
import prisma, { safeDbQuery, isDbConfigured } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (session?.role !== "ADMIN") return NextResponse.json({ folders: [] });
  if (!isDbConfigured()) return NextResponse.json({ folders: [] });
  const folders = await safeDbQuery(
    () =>
      prisma.folder.findMany({
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          color: true,
          parentId: true,
          createdAt: true,
        },
      }),
    []
  );
  return NextResponse.json({ folders });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (session?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let body: { name?: string; color?: string; parentId?: string | null };
  try { body = await req.json(); } catch { body = {}; }
  if (!isDbConfigured()) {
    const mock = { id: `folder_${Date.now()}`, name: body.name ?? "Untitled Folder", color: body.color ?? "#00f0ff", parentId: body.parentId ?? null, createdAt: new Date().toISOString() };
    return NextResponse.json({ folder: mock, fallback: true }, { status: 201 });
  }
  const folder = await safeDbQuery(() => prisma.folder.create({ data: { name: body.name ?? "Untitled Folder", color: body.color ?? "#00f0ff", parentId: body.parentId ?? null } }), null);
  if (!folder) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  return NextResponse.json({ folder }, { status: 201 });
}
