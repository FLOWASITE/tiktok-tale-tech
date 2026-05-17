// Helpers for campaign period scope (month / quarter / year / custom)
import type { CampaignPeriodType } from '@/types/agent';

export interface PeriodRange {
  startDate: string;   // YYYY-MM-DD
  durationDays: number;
  label: string;
}

function fmt(d: Date): string {
  return d.toISOString().split('T')[0];
}

function daysBetweenInclusive(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)) + 1);
}

export function computePeriodRange(type: CampaignPeriodType, ref: Date = new Date()): PeriodRange | null {
  const year = ref.getFullYear();
  const month = ref.getMonth(); // 0-11

  if (type === 'month') {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0); // last day of this month
    return {
      startDate: fmt(start),
      durationDays: daysBetweenInclusive(start, end),
      label: `Tháng ${month + 1}/${year}`,
    };
  }

  if (type === 'quarter') {
    const q = Math.floor(month / 3); // 0..3
    const start = new Date(year, q * 3, 1);
    const end = new Date(year, q * 3 + 3, 0);
    return {
      startDate: fmt(start),
      durationDays: daysBetweenInclusive(start, end),
      label: `Q${q + 1} ${year}`,
    };
  }

  if (type === 'year') {
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    return {
      startDate: fmt(start),
      durationDays: daysBetweenInclusive(start, end),
      label: `${year}`,
    };
  }

  return null; // custom
}

export function describePeriodOption(type: CampaignPeriodType): string {
  const r = computePeriodRange(type);
  if (!r) return 'Tự nhập số ngày';
  const start = new Date(r.startDate);
  const end = new Date(start);
  end.setDate(end.getDate() + r.durationDays - 1);
  return `${start.getDate()}/${start.getMonth() + 1} → ${end.getDate()}/${end.getMonth() + 1}`;
}
