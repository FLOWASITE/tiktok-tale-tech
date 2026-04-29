// Pricing v2 quota helper — 3 đơn vị output: content / image / video
// Dùng trong edge functions để check trước khi generate.
// Frontend đã có safety net qua useSubscription.isWithinLimits;
// đây là layer thứ 2 chống bypass khi gọi function trực tiếp.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

export type UnitType = "content" | "image" | "video";

export interface QuotaCheckResult {
  allowed: boolean;
  unitType: UnitType;
  used?: number;
  limit?: number;
  reason?: string;
}

/**
 * Kiểm tra quota cho 1 đơn vị output trước khi generate.
 * Trả về { allowed: false } khi vượt limit; caller nên return 402 + message.
 */
export async function checkUnitQuota(
  client: SupabaseClient,
  organizationId: string,
  unitType: UnitType,
  amount = 1,
): Promise<QuotaCheckResult> {
  if (!organizationId) {
    return { allowed: false, unitType, reason: "missing_organization_id" };
  }

  const { data, error } = await client.rpc("can_use_unit", {
    _org_id: organizationId,
    _unit_type: unitType,
    _amount: amount,
  });

  if (error) {
    console.error("[quota-units] can_use_unit RPC error:", error);
    // Fail-open để không block user khi RPC lỗi tạm thời
    return { allowed: true, unitType, reason: "rpc_error_fail_open" };
  }

  if (data === true) return { allowed: true, unitType };

  // Nếu false, fetch chi tiết để hiển thị
  const { data: used } = await client.rpc("get_org_usage_units", {
    _org_id: organizationId,
    _unit_type: unitType,
  });

  return {
    allowed: false,
    unitType,
    used: typeof used === "number" ? used : undefined,
    reason: "quota_exceeded",
  };
}

/**
 * Build response 402 thân thiện khi vượt quota.
 */
export function buildQuotaExceededResponse(
  result: QuotaCheckResult,
  corsHeaders: Record<string, string>,
): Response {
  const labelMap: Record<UnitType, string> = {
    content: "Nội dung",
    image: "Ảnh AI",
    video: "Video",
  };
  return new Response(
    JSON.stringify({
      error: `Đã hết hạn mức ${labelMap[result.unitType]} trong chu kỳ này. Vui lòng nâng cấp gói hoặc mua thêm.`,
      code: "QUOTA_EXCEEDED",
      unit_type: result.unitType,
      used: result.used ?? null,
    }),
    {
      status: 402,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}
