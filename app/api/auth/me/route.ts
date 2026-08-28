export const runtime = "edge";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ role: "GUEST", authenticated: false }, { status: 200 });
  }
  return NextResponse.json({ ...session, authenticated: true });
}
