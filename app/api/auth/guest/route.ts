import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { apiLimiter } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const { success } = await apiLimiter.limit(`guest:${ip}`);
  if (!success) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const guestId = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const res = NextResponse.json({ ok: true, role: "GUEST", guestId });
  await createSession("GUEST", res, { userId: guestId });
  return res;
}
