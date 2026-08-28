import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { redis } from "@/lib/redis";

export async function GET() {
  const session = await getSession();
  if (session?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let dbStatus: string = "unknown";
  let docCount: number | string = "—";
  let projectCount: number | string = "—";
  let redisLatency: string = "—";
  let redisStatus: string = "unknown";

  try {
    const t0 = Date.now();
    await redis.ping();
    redisLatency = `${Date.now() - t0}ms`;
    redisStatus = "connected";
  } catch {
    redisStatus = "disconnected";
    redisLatency = "n/a";
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "connected";
    docCount = await prisma.document.count();
    projectCount = await prisma.project.count();
  } catch {
    dbStatus = "disconnected";
  }

  const isSqlite = (process.env.DATABASE_URL ?? "").startsWith("file:");

  return NextResponse.json({
    db: { status: dbStatus, docCount, projectCount, kind: isSqlite ? "SQLite" : "Postgres", label: isSqlite ? "Local dev.db Active" : "Neon Connected" },
    redis: { status: redisStatus, latency: redisLatency },
    session: { role: session.role },
    timestamp: new Date().toISOString(),
  });
}
