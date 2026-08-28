import { Redis } from "@upstash/redis";

declare global {
  // eslint-disable-next-line no-var
  var redis: Redis | undefined;
}

function createRedis(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token || url.includes("sample")) {
    // Return a no-op mock when env is placeholder so build/dev doesn't crash
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Proxy({} as Redis, {
      get(_target, prop) {
        if (prop === "ping") return async () => "PONG (mock)";
        // For rate limit / get / set / incr etc — return null / 0 gracefully
        return async () => null;
      },
    });
  }
  return new Redis({ url, token });
}

export const redis: Redis = globalThis.redis ?? createRedis();

if (process.env.NODE_ENV !== "production") {
  globalThis.redis = redis;
}

export default redis;
