import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/redis";

// Sliding window limiters — gracefully degrade to allow-all when Redis is mock
function safeLimiter(
  limiter: Ratelimit
): { limit: (id: string) => Promise<{ success: boolean; remaining: number; reset: number }> } {
  return {
    async limit(id: string) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res: any = await limiter.limit(id);
        // Upstash returns { success, limit, remaining, reset }
        if (res && typeof res.success === "boolean") return res;
        return { success: true, remaining: 999, reset: 0 };
      } catch {
        return { success: true, remaining: 999, reset: 0 };
      }
    },
  };
}

export const loginLimiter = safeLimiter(
  new Ratelimit({
    redis: redis as never,
    limiter: Ratelimit.slidingWindow(5, "1 m"),
    prefix: "rl:login",
    analytics: true,
  })
);

export const apiLimiter = safeLimiter(
  new Ratelimit({
    redis: redis as never,
    limiter: Ratelimit.slidingWindow(60, "1 m"),
    prefix: "rl:api",
    analytics: true,
  })
);

export const docWriteLimiter = safeLimiter(
  new Ratelimit({
    redis: redis as never,
    limiter: Ratelimit.slidingWindow(20, "1 m"),
    prefix: "rl:docwrite",
    analytics: true,
  })
);
