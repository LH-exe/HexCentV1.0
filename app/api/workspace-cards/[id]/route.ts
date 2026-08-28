import { NextRequest, NextResponse } from "next/server";
import prisma, { isDbConfigured } from "@/lib/db";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (session?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  if (!isDbConfigured()) return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  try {
    const card = await prisma.workspaceCard.findUnique({ where: { id } });
    if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ card });
  } catch (err) {
    console.error("[GET /api/workspace-cards/[id]] Error:", err);
    return NextResponse.json({ error: "Failed to fetch card" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (session?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const updateData: Record<string, any> = {};

    if (body.title !== undefined) updateData.title = String(body.title);
    if (body.description !== undefined) updateData.description = String(body.description);
    if (body.icon !== undefined) updateData.icon = String(body.icon);
    if (body.iconColor !== undefined) updateData.iconColor = String(body.iconColor);
    if (body.titleColor !== undefined) updateData.titleColor = String(body.titleColor);
    if (body.summaryColor !== undefined) updateData.summaryColor = String(body.summaryColor);
    if (body.status !== undefined) updateData.status = String(body.status);
    if (body.tags !== undefined) updateData.tags = typeof body.tags === "string" ? body.tags : JSON.stringify(body.tags);

    // Serialization Guard
    if (body.content !== undefined) {
      updateData.content = typeof body.content === "string" ? body.content : JSON.stringify(body.content);
    }

    if (!isDbConfigured()) return NextResponse.json({ card: { id, ...updateData }, fallback: true });
    const updatedCard = await prisma.workspaceCard.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ ok: true, card: updatedCard });
  } catch (err) {
    console.error("[PATCH /api/workspace-cards/[id]] Error:", err);
    return NextResponse.json({ error: "Failed to update workspace card" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (session?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  if (!isDbConfigured()) return NextResponse.json({ ok: true, fallback: true });
  try { await prisma.workspaceCard.delete({ where: { id } }); return NextResponse.json({ ok: true }); }
  catch { return NextResponse.json({ error: "Not found" }, { status: 404 }); }
}
