import { PrismaClient } from "@prisma/client"

// --- Neon pooling enforcement: ensure pgbouncer=true for serverless to prevent connection starvation ---
function ensurePooledUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  if (url.includes("localhost") || url.includes("127.0.0.1") || url.includes("file:")) return url;
  if (url.includes("neon.tech") && !url.includes("pgbouncer")) {
    const sep = url.includes("?") ? "&" : "?";
    const pooled = `${url}${sep}pgbouncer=true&connection_limit=1`;
    // Mutate env so Prisma datasource reads pooled variant (serverless-friendly)
    process.env.DATABASE_URL = pooled;
    if (process.env.NODE_ENV !== "production") console.log("[db] Neon pooling enabled (pgbouncer=true)");
    return pooled;
  }
  return url;
}
ensurePooledUrl(process.env.DATABASE_URL);

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient; __inMemoryFallback?: { documents: Map<string, unknown>; folders: Map<string, unknown>; tasks: Map<string, unknown>; projects: Map<string, unknown>; layouts: Map<string, unknown> } }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

// Helpers for offline/resilient fallback (SQLite file may be missing in some envs)
function getFallbackStore() {
  if (!globalForPrisma.__inMemoryFallback) {
    globalForPrisma.__inMemoryFallback = {
      documents: new Map(),
      folders: new Map(),
      tasks: new Map(),
      projects: new Map(),
      layouts: new Map(),
    }
  }
  return globalForPrisma.__inMemoryFallback
}

export function isDbConfigured(): boolean {
  const url = process.env.DATABASE_URL ?? ""
  if (!url || url.trim() === "") return false
  if (url.includes("sample") || url.includes("placeholder")) return false
  return true
}

export async function safeDbQuery<T>(queryFn: () => Promise<T>, fallbackData: T): Promise<T> {
  if (!isDbConfigured()) return fallbackData
  try {
    return await queryFn()
  } catch (e) {
    console.warn("[db] query failed, using fallback:", e instanceof Error ? e.message : String(e))
    return fallbackData
  }
}

export function getInMemoryStore() {
  return getFallbackStore()
}

export default prisma
