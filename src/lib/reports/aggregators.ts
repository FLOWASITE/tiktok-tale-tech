import { startOfWeek, startOfMonth, addDays, addWeeks, addMonths, format, differenceInCalendarDays } from 'date-fns';
import { vi } from 'date-fns/locale';

/**
 * Helpers to aggregate raw rows into chart-friendly buckets.
 */
export type BucketType = 'day' | 'week' | 'month';

export function bucketByDay<T>(
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

function weekKey(d: Date): string {
  const start = startOfWeek(d, { weekStartsOn: 1 });
  return format(start, 'yyyy-MM-dd');
}

function monthKey(d: Date): string {
  return format(startOfMonth(d), 'yyyy-MM');
}

export function bucketByWeek<T>(
  rows: T[],
  getDate: (row: T) => string | null | undefined,
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const r of rows) {
    const raw = getDate(r);
    if (!raw) continue;
    const key = weekKey(new Date(raw));
    const arr = map.get(key) ?? [];
    arr.push(r);
    map.set(key, arr);
  }
  return map;
}

export function bucketByMonth<T>(
  rows: T[],
  getDate: (row: T) => string | null | undefined,
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const r of rows) {
    const raw = getDate(r);
    if (!raw) continue;
    const key = monthKey(new Date(raw));
    const arr = map.get(key) ?? [];
    arr.push(r);
    map.set(key, arr);
  }
  return map;
}

export function bucketRows<T>(
  rows: T[],
  bucket: BucketType,
  getDate: (row: T) => string | null | undefined,
): Map<string, T[]> {
  if (bucket === 'week') return bucketByWeek(rows, getDate);
  if (bucket === 'month') return bucketByMonth(rows, getDate);
  return bucketByDay(rows, getDate);
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

export function fillBucketGaps(
  from: Date,
  to: Date,
  bucket: BucketType,
  data: Map<string, number>,
): { date: string; value: number }[] {
  if (bucket === 'day') return fillDateGaps(from, to, data);

  const out: { date: string; value: number }[] = [];
  if (bucket === 'week') {
    let cursor = startOfWeek(from, { weekStartsOn: 1 });
    const end = startOfWeek(to, { weekStartsOn: 1 });
    while (cursor <= end) {
      const key = format(cursor, 'yyyy-MM-dd');
      out.push({ date: key, value: data.get(key) ?? 0 });
      cursor = addWeeks(cursor, 1);
    }
    return out;
  }
  // month
  let cursor = startOfMonth(from);
  const end = startOfMonth(to);
  while (cursor <= end) {
    const key = format(cursor, 'yyyy-MM');
    out.push({ date: key, value: data.get(key) ?? 0 });
    cursor = addMonths(cursor, 1);
  }
  return out;
}

export function suggestBucket(from: Date, to: Date): BucketType {
  const days = Math.max(1, differenceInCalendarDays(to, from));
  if (days <= 14) return 'day';
  if (days <= 90) return 'week';
  return 'month';
}

export function formatBucketLabel(key: string, bucket: BucketType): string {
  if (bucket === 'month') {
    // key = yyyy-MM
    const [y, m] = key.split('-');
    return `${m}/${y}`;
  }
  if (bucket === 'week') {
    const d = new Date(key);
    const end = addDays(d, 6);
    return `${format(d, 'dd/MM', { locale: vi })}–${format(end, 'dd/MM', { locale: vi })}`;
  }
  // day yyyy-MM-dd
  return format(new Date(key), 'dd/MM', { locale: vi });
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
