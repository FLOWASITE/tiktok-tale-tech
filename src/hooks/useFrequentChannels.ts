import { useCallback, useEffect, useState } from 'react';
import type { Channel } from '@/types/multichannel';

const STORAGE_PREFIX = 'flowa.frequentChannels.v1';
const DECAY_DAYS = 90;
const MIN_COUNT = 1;
const MAX_FREQUENT = 8;

type Entry = { count: number; lastUsedAt: string };
type Store = Partial<Record<Channel, Entry>>;

function storageKey(orgId?: string, brandId?: string) {
  return `${STORAGE_PREFIX}.${orgId || 'noorg'}.${brandId || 'global'}`;
}

function readStore(key: string): Store {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Store;
    const cutoff = Date.now() - DECAY_DAYS * 24 * 60 * 60 * 1000;
    const cleaned: Store = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (!v) continue;
      if (new Date(v.lastUsedAt).getTime() >= cutoff) {
        cleaned[k as Channel] = v;
      }
    }
    return cleaned;
  } catch {
    return {};
  }
}

function writeStore(key: string, store: Store) {
  try {
    localStorage.setItem(key, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

export function useFrequentChannels(orgId?: string, brandId?: string) {
  const key = storageKey(orgId, brandId);
  const [store, setStore] = useState<Store>(() => readStore(key));

  useEffect(() => {
    setStore(readStore(key));
  }, [key]);

  const recordUsage = useCallback(
    (channels: Channel[]) => {
      if (!channels?.length) return;
      const now = new Date().toISOString();
      setStore((prev) => {
        const next: Store = { ...prev };
        for (const ch of channels) {
          const cur = next[ch];
          next[ch] = { count: (cur?.count || 0) + 1, lastUsedAt: now };
        }
        writeStore(key, next);
        return next;
      });
    },
    [key]
  );

  const counts: Partial<Record<Channel, number>> = {};
  const sorted = Object.entries(store)
    .filter(([, v]) => (v?.count || 0) >= MIN_COUNT)
    .sort((a, b) => {
      const ca = a[1]?.count || 0;
      const cb = b[1]?.count || 0;
      if (cb !== ca) return cb - ca;
      const la = a[1]?.lastUsedAt || '';
      const lb = b[1]?.lastUsedAt || '';
      return lb.localeCompare(la);
    });
  for (const [k, v] of sorted) counts[k as Channel] = v?.count || 0;
  const frequent = sorted.slice(0, MAX_FREQUENT).map(([k]) => k as Channel);

  return { frequent, counts, recordUsage };
}
