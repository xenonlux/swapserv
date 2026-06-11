import { createClient } from "redis"

// ============================================================
// Redis Client Configuration
// ============================================================

let client: ReturnType<typeof createClient> | null = null

export async function getRedisClient() {
  if (!client) {
    client = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) return new Error("Redis max retries exceeded")
          return Math.min(retries * 100, 3000)
        },
      },
    })

    client.on("error", (err) => console.error("Redis Client Error:", err))
    client.on("connect", () => console.log("Redis connected"))
    client.on("reconnecting", () => console.log("Redis reconnecting..."))

    await client.connect()
  }

  return client
}

// ============================================================
// Cache Utilities
// ============================================================

export class Cache {
  private static prefix = "swaphub:"

  static key(...parts: string[]) {
    return `${this.prefix}${parts.join(":")}`
  }

  static async get<T>(key: string): Promise<T | null> {
    const redis = await getRedisClient()
    const value = await redis.get(key)
    if (!value) return null
    try {
      return JSON.parse(value) as T
    } catch {
      return value as unknown as T
    }
  }

  static async set(
    key: string,
    value: unknown,
    ttlSeconds = 3600
  ): Promise<void> {
    const redis = await getRedisClient()
    const serialized =
      typeof value === "string" ? value : JSON.stringify(value)
    await redis.setEx(key, ttlSeconds, serialized)
  }

  static async del(...keys: string[]): Promise<void> {
    const redis = await getRedisClient()
    if (keys.length > 0) await redis.del(keys)
  }

  static async delPattern(pattern: string): Promise<void> {
    const redis = await getRedisClient()
    const keys = await redis.keys(`${this.prefix}${pattern}`)
    if (keys.length > 0) await redis.del(keys)
  }

  static async exists(key: string): Promise<boolean> {
    const redis = await getRedisClient()
    return (await redis.exists(key)) === 1
  }

  static async ttl(key: string): Promise<number> {
    const redis = await getRedisClient()
    return redis.ttl(key)
  }

  static async incr(key: string, ttlSeconds?: number): Promise<number> {
    const redis = await getRedisClient()
    const value = await redis.incr(key)
    if (ttlSeconds && value === 1) {
      await redis.expire(key, ttlSeconds)
    }
    return value
  }

  static async hSet(
    key: string,
    field: string,
    value: unknown
  ): Promise<void> {
    const redis = await getRedisClient()
    await redis.hSet(key, field, JSON.stringify(value))
  }

  static async hGet<T>(key: string, field: string): Promise<T | null> {
    const redis = await getRedisClient()
    const value = await redis.hGet(key, field)
    if (!value) return null
    return JSON.parse(value) as T
  }

  static async hGetAll<T>(key: string): Promise<Record<string, T>> {
    const redis = await getRedisClient()
    const data = await redis.hGetAll(key)
    const result: Record<string, T> = {}
    for (const [k, v] of Object.entries(data)) {
      result[k] = JSON.parse(v) as T
    }
    return result
  }

  // Online users tracking
  static async setUserOnline(userId: string): Promise<void> {
    const redis = await getRedisClient()
    await redis.sAdd(this.key("online_users"), userId)
    await redis.setEx(this.key("user_last_seen", userId), 300, Date.now().toString())
  }

  static async setUserOffline(userId: string): Promise<void> {
    const redis = await getRedisClient()
    await redis.sRem(this.key("online_users"), userId)
  }

  static async isUserOnline(userId: string): Promise<boolean> {
    const redis = await getRedisClient()
    return redis.sIsMember(this.key("online_users"), userId)
  }

  static async getOnlineUsers(): Promise<string[]> {
    const redis = await getRedisClient()
    return redis.sMembers(this.key("online_users"))
  }
}

// ============================================================
// Rate Limiter using Redis
// ============================================================

export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  const redis = await getRedisClient()
  const fullKey = Cache.key("rate_limit", key)
  
  const current = await redis.incr(fullKey)
  
  if (current === 1) {
    await redis.expire(fullKey, windowSeconds)
  }
  
  const ttl = await redis.ttl(fullKey)
  const remaining = Math.max(0, limit - current)
  
  return {
    allowed: current <= limit,
    remaining,
    resetIn: ttl,
  }
}

// ============================================================
// Session Store
// ============================================================

export const SESSION_TTL = 60 * 60 * 24 * 7 // 7 days

export async function storeSession(
  sessionId: string,
  data: Record<string, unknown>
): Promise<void> {
  await Cache.set(Cache.key("session", sessionId), data, SESSION_TTL)
}

export async function getSession(
  sessionId: string
): Promise<Record<string, unknown> | null> {
  return Cache.get(Cache.key("session", sessionId))
}

export async function deleteSession(sessionId: string): Promise<void> {
  await Cache.del(Cache.key("session", sessionId))
}
