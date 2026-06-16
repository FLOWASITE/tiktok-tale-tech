// Hard-limit số channel mỗi lần generate multichannel theo subscription tier.
// Áp dụng cả ở backend (generate-multichannel) và frontend (MultiChannelFormWizard).
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

export async function resolveOrgTier(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  organizationId: string | null | undefined,
): Promise<PlanTier> {
  if (!organizationId) return "free";
  const { data } = await supabase
    .from("subscriptions")
    .select("plan_type, status")
    .eq("organization_id", organizationId)
    .in("status", ["active", "trial"])
    .order("current_period_end", { ascending: false })
    .limit(1)
    .maybeSingle();
  return ((data?.plan_type as PlanTier) ?? "free");
}

export interface TierLimitCheck {
  allowed: boolean;
  tier: PlanTier;
  limit: number;
  requested: number;
  message?: string;
}

export async function checkMultichannelTierLimit(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  organizationId: string | null | undefined,
  requestedChannels: number,
): Promise<TierLimitCheck> {
  const tier = await resolveOrgTier(supabase, organizationId);
  const limit = getMaxChannelsForTier(tier);
  const allowed = requestedChannels <= limit;
  return {
    allowed,
    tier,
    limit,
    requested: requestedChannels,
    message: allowed
      ? undefined
      : `Gói ${tier.toUpperCase()} chỉ cho phép tối đa ${limit} kênh mỗi lần tạo. Bạn đang chọn ${requestedChannels} kênh. Vui lòng giảm bớt hoặc nâng cấp gói.`,
  };
}
