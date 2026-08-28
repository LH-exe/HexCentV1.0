export const runtime = "edge";

import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}

export async function GET() {
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}
