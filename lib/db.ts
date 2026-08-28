import { PrismaClient } from "@prisma/client"

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
