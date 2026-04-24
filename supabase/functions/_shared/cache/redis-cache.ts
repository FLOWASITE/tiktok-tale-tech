// ============================================
// Smart Cache Layer — Upstash Redis
// Graceful fallback if Redis unavailable
// ============================================

let redisClient: any = null;
let redisInitAttempted = false;

export async function getRedis(): Promise<any | null> {
  if (redisInitAttempted) return redisClient;
  redisInitAttempted = true;

  const url = Deno.env.get('UPSTASH_REDIS_REST_URL');
  const token = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');

  if (!url || !token) {
    console.log('[RedisCache] No Upstash credentials, cache disabled');
    return null;
  }

  try {
    const { Redis } = await import('https://esm.sh/@upstash/redis@1.34.3');
    redisClient = new Redis({ url, token });
    console.log('[RedisCache] Connected');
    return redisClient;
  } catch (err) {
    console.warn('[RedisCache] Failed to initialize:', err);
    return null;
  }
}

// ---- Cache Key Generation ----

export async function generateCacheKey(
  brandId: string,
  nodeType: string,
  stateSubset: Record<string, any>,
  promptVersion: string = 'v1',
  brandVersion?: number
): Promise<string> {
  const payload = JSON.stringify({ ...stateSubset, _pv: promptVersion, _bv: brandVersion ?? 0 });
  const hashBuffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(payload)
  );
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return `flowa:cache:${brandId}:${nodeType}:${hashHex.slice(0, 32)}`;
}

// ---- Cache Decorator ----

export async function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  ttlSeconds = 3600
): Promise<T> {
  const redis = await getRedis();

  if (!redis) {
    return fn(); // Graceful fallback
  }

  try {
    const cached = await redis.get(key);
    if (cached) {
      console.log(`[RedisCache] HIT: ${key}`);
      return typeof cached === 'string' ? JSON.parse(cached) : cached;
    }
  } catch (err) {
    console.warn(`[RedisCache] GET error: ${err}`);
  }

  const result = await fn();

  try {
    await redis.set(key, JSON.stringify(result), { ex: ttlSeconds });
    console.log(`[RedisCache] SET: ${key} (TTL=${ttlSeconds}s)`);
  } catch (err) {
    console.warn(`[RedisCache] SET error: ${err}`);
  }

  return result;
}

// ---- Invalidation ----

export async function invalidateByPrefix(prefix: string): Promise<number> {
  const redis = await getRedis();
  if (!redis) return 0;

  try {
    const keys = await redis.keys(`${prefix}*`);
    if (keys.length === 0) return 0;

    const pipeline = redis.pipeline();
    for (const key of keys) {
      pipeline.del(key);
    }
    await pipeline.exec();
    console.log(`[RedisCache] Invalidated ${keys.length} keys with prefix: ${prefix}`);
    return keys.length;
  } catch (err) {
    console.warn(`[RedisCache] Invalidation error: ${err}`);
    return 0;
  }
}
