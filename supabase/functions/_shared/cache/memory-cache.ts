// ============================================
// L1 In-Memory Cache — LRU Map with TTL
// Fast local cache layer before Redis/DB lookups
// ============================================

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  lastAccessed: number;
}

class LRUMemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly maxSize: number;
  private hits = 0;
  private misses = 0;

  constructor(maxSize = 200) {
    this.maxSize = maxSize;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    // Check expiry
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Update LRU order: delete & re-insert
    this.cache.delete(key);
    entry.lastAccessed = Date.now();
    this.cache.set(key, entry);
    this.hits++;
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds = 300): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
      lastAccessed: Date.now(),
    });
  }

  invalidate(key: string): boolean {
    return this.cache.delete(key);
  }

  invalidateByPrefix(prefix: string): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getStats() {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? ((this.hits / total) * 100).toFixed(1) + '%' : '0%',
    };
  }
}

// ---- Singleton Instances ----

/** General-purpose L1 cache (brand data, org config, etc.) */
export const memoryCache = new LRUMemoryCache(200);

/** Smaller cache for subscription/quota checks */
export const quotaCache = new LRUMemoryCache(50);

// ---- Helper: Cache-through pattern ----

/**
 * Get value from L1 cache or fetch & store
 * 
 * Usage:
 * ```ts
 * const brand = await cacheThrough(
 *   `brand:${brandId}`,
 *   () => fetchBrandFromDB(brandId),
 *   300 // 5 minutes TTL
 * );
 * ```
 */
export async function cacheThrough<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds = 300,
  cache: LRUMemoryCache = memoryCache,
): Promise<T> {
  const cached = cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  const value = await fetchFn();
  cache.set(key, value, ttlSeconds);
  return value;
}

// ---- Cache Key Builders ----

export const CacheKeys = {
  brand: (id: string) => `brand:${id}`,
  orgConfig: (id: string) => `org:${id}:config`,
  subscription: (orgId: string) => `sub:${orgId}`,
  aiConfig: (orgId: string, fn: string) => `ai:${orgId}:${fn}`,
  platformSettings: (platform: string) => `platform:${platform}`,
  industryTemplate: (id: string) => `industry:${id}`,
} as const;
