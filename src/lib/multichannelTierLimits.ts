// Frontend mirror của supabase/functions/_shared/multichannel-tier-limits.ts.
// Giữ đồng bộ với backend: Free 3 / Starter 6 / Pro 12 / Enterprise ∞.
export type PlanTier = "free" | "starter" | "pro" | "enterprise";

export const MULTICHANNEL_MAX_CHANNELS_PER_RUN: Record<PlanTier, number> = {
  free: 3,
  starter: 6,
  pro: 12,
  enterprise: Number.POSITIVE_INFINITY,
};

export function getMaxChannelsForTier(tier: PlanTier | string | null | undefined): number {
  const t = (tier ?? "free") as PlanTier;
  return MULTICHANNEL_MAX_CHANNELS_PER_RUN[t] ?? MULTICHANNEL_MAX_CHANNELS_PER_RUN.free;
}

export function formatTierLimit(tier: PlanTier | string | null | undefined): string {
  const max = getMaxChannelsForTier(tier);
  return Number.isFinite(max) ? `${max} kênh` : "không giới hạn";
}
