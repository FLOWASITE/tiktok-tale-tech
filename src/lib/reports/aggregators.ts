/**
 * Helpers to aggregate raw rows into chart-friendly buckets.
 */
export function bucketByDay<T extends { created_at?: string | null; performed_at?: string | null }>(
  rows: T[],
  getDate: (row: T) => string | null | undefined,
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const r of rows) {
    const raw = getDate(r);
    if (!raw) continue;
    const key = new Date(raw).toISOString().slice(0, 10);
    const arr = map.get(key) ?? [];
    arr.push(r);
    map.set(key, arr);
  }
  return map;
}

export function fillDateGaps(
  from: Date,
  to: Date,
  data: Map<string, number>,
): { date: string; value: number }[] {
  const out: { date: string; value: number }[] = [];
  const cursor = new Date(from);
  cursor.setUTCHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setUTCHours(0, 0, 0, 0);
  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    out.push({ date: key, value: data.get(key) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

export function groupCount<T>(rows: T[], getKey: (r: T) => string | null | undefined) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = getKey(r) ?? 'unknown';
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return map;
}

export function mapToArray<K, V>(map: Map<K, V>): { key: K; value: V }[] {
  return [...map.entries()].map(([key, value]) => ({ key, value }));
}
