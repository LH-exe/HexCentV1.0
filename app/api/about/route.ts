import { NextRequest, NextResponse } from "next/server";
import prisma, { safeDbQuery, isDbConfigured } from "@/lib/db";
import { getSession } from "@/lib/auth";

const PAGE_KEY = "about_me";

export async function GET() {
  const headers = {
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    "CDN-Cache-Control": "public, s-maxage=60",
    "Vercel-CDN-Cache-Control": "public, s-maxage=60",
  };
  if (!isDbConfigured()) {
    return NextResponse.json({ layout: [], fallback: true }, { headers });
  }
  const layout = await safeDbQuery(
    () => prisma.pageLayout.findUnique({ where: { pageKey: PAGE_KEY } }),
    null
  );
  if (!layout) return NextResponse.json({ layout: [] }, { headers });
  try {
    const parsed = JSON.parse(layout.layoutJson);
    return NextResponse.json({ layout: parsed }, { headers });
  } catch {
    return NextResponse.json({ layout: [] }, { headers });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (session?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let body: { layout?: unknown[] };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!Array.isArray(body.layout)) return NextResponse.json({ error: "layout must be array" }, { status: 400 });

  if (!isDbConfigured()) {
    return NextResponse.json({ ok: true, fallback: true });
  }

  const json = JSON.stringify(body.layout);
  const existing = await safeDbQuery(() => prisma.pageLayout.findUnique({ where: { pageKey: PAGE_KEY } }), null);
  if (existing) {
    await prisma.pageLayout.update({ where: { pageKey: PAGE_KEY }, data: { layoutJson: json } });
  } else {
    await prisma.pageLayout.create({ data: { pageKey: PAGE_KEY, layoutJson: json } });
  }
  return NextResponse.json({ ok: true });
}
