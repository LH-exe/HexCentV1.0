export const runtime = "edge";

import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth";

export async function POST() {
  const guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const res = NextResponse.json({ ok: true, role: "GUEST", guestId });
  await createSession("GUEST", res, { userId: guestId });
  return res;
}
