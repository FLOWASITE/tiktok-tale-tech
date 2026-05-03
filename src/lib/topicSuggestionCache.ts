/**
 * Client-side cache cho gợi ý topic theo (clusterId, sortedKeywordIds).
 * TTL 10 phút; in-memory + sessionStorage mirror để giữ qua step navigation.
 */

const TTL_MS = 10 * 60 * 1000;
const STORAGE_KEY = 'mc:topic_suggest_cache:v1';
const MAX_ENTRIES = 30;

interface Entry<T> {
  value: T;
  expiresAt: number;
}

const memory = new Map<string, Entry<unknown>>();

function loadFromStorage() {
  if (typeof window === 'undefined' || memory.size > 0) return;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, Entry<unknown>>;
    const now = Date.now();
    for (const [k, v] of Object.entries(parsed)) {
      if (v && v.expiresAt > now) memory.set(k, v);
    }
  } catch {
    /* ignore */
  }
}

function persist() {
  if (typeof window === 'undefined') return;
  try {
    const obj: Record<string, Entry<unknown>> = {};
    for (const [k, v] of memory.entries()) obj[k] = v;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch {
    /* quota or disabled — ignore */
  }
}

export function buildKey(clusterId: string, keywordIds: string[]): string {
  const sorted = [...(keywordIds || [])].filter(Boolean).sort();
  return `${clusterId}::${sorted.join(',')}`;
}

export function getCached<T>(key: string): T | null {
  loadFromStorage();
  const entry = memory.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    memory.delete(key);
    persist();
    return null;
  }
  return entry.value as T;
}

export function setCached<T>(key: string, value: T): void {
  loadFromStorage();
  memory.set(key, { value, expiresAt: Date.now() + TTL_MS });
  // Trim oldest if over limit
  if (memory.size > MAX_ENTRIES) {
    const firstKey = memory.keys().next().value;
    if (firstKey) memory.delete(firstKey);
  }
  persist();
}

export function clearCached(key: string): void {
  if (memory.delete(key)) persist();
}
