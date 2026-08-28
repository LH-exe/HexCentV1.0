import { NextRequest, NextResponse } from "next/server";
import { createSession, getAdminPassword } from "@/lib/auth";
import { loginLimiter } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "127.0.0.1";
  const { success } = await loginLimiter.limit(`login:${ip}`);
  if (!success) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const adminPassword = getAdminPassword();

  if (!body.password || body.password !== adminPassword) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, role: "ADMIN" });
  await createSession("ADMIN", res);
  return res;
}
