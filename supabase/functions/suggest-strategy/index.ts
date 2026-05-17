import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { callAI } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Heuristic helpers ───
// Budget allocation per primary objective (content/ads/kol summing 100)
const BUDGET_BY_OBJ: Record<string, { content: number; ads: number; kol: number }> = {
  awareness:  { content: 40, ads: 35, kol: 25 },
  engagement: { content: 55, ads: 25, kol: 20 },
  traffic:    { content: 60, ads: 30, kol: 10 },
  leads:      { content: 45, ads: 45, kol: 10 },
  conversion: { content: 35, ads: 55, kol: 10 },
  revenue:    { content: 35, ads: 50, kol: 15 },
  retention:  { content: 75, ads: 15, kol: 10 },
  community:  { content: 65, ads: 15, kol: 20 },
};

// Channels-per-day baseline → posts target ≈ duration * avgFreq * channels
function estimatePostsTarget(durationDays: number, channelCount: number): number {
  const days = Math.max(3, durationDays || 14);
  const ch = Math.max(1, channelCount || 1);
  // Avg ~3 bài/tuần/kênh = 0.43/ngày
  const est = Math.round(days * 0.43 * ch);
  return Math.min(500, Math.max(3, est));
}

function evenSplit(keys: string[]): Record<string, number> {
  if (keys.length === 0) return {};
  const base = Math.floor(100 / keys.length);
  const rem = 100 - base * keys.length;
  const out: Record<string, number> = {};
  keys.forEach((k, i) => { out[k] = base + (i === 0 ? rem : 0); });
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const title: string = body.title || "";
    const description: string = body.description || "";
    const objectives: string[] = Array.isArray(body.objectives) ? body.objectives.filter((o: unknown) => typeof o === "string") : [];
    const channels: string[] = Array.isArray(body.target_channels) ? body.target_channels.filter((c: unknown) => typeof c === "string") : [];
    const durationDays: number = Number(body.campaign_duration_days) || 14;
    const brandTemplateId: string | undefined = body.brand_template_id;
    const organizationId: string | undefined = body.organization_id;

    if (objectives.length === 0 && !description.trim() && !title.trim()) {
      return new Response(
        JSON.stringify({ error: "Cần có mục tiêu hoặc mô tả chiến dịch" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Brand context
    let brandName = "";
    let industry = "";
    let toneOfVoice = "";
    let brandPositioning = "";
    let targetAudience = "";
    let contentPillars: string[] = [];
    if (brandTemplateId) {
      try {
        const { data: brand } = await supabase
          .from("brand_templates")
          .select("brand_name, industry, tone_of_voice, brand_positioning, target_audience, content_pillars")
          .eq("id", brandTemplateId)
          .maybeSingle();
        if (brand) {
          brandName = (brand as any).brand_name || "";
          const ind = (brand as any).industry;
          industry = Array.isArray(ind) ? (ind[0] || "") : (ind || "");
          toneOfVoice = (brand as any).tone_of_voice || "";
          brandPositioning = (brand as any).brand_positioning || "";
          targetAudience = (brand as any).target_audience || "";
          const pillars = (brand as any).content_pillars;
          if (Array.isArray(pillars)) {
            contentPillars = pillars
              .map((p: any) => (typeof p === "string" ? p : p?.name))
              .filter((p: any): p is string => typeof p === "string" && p.length > 0);
          }
        }
      } catch { /* ignore */ }
    }

    // ─── Heuristic part (deterministic, không cần AI) ───
    const primary = (objectives[0] || "awareness").toLowerCase();
    const budgetAllocation = BUDGET_BY_OBJ[primary] || BUDGET_BY_OBJ.awareness;
    const pillarAllocation = evenSplit(contentPillars);
    const totalPostsTarget = estimatePostsTarget(durationDays, channels.length || 3);

    // ─── AI part: key_messages + primary_cta (cần ngôn ngữ + brand voice) ───
    const objectivesLabel = objectives.join(", ") || "awareness";
    const channelsLabel = channels.join(", ") || "facebook, instagram";
    const prompt = `Bạn là content strategist cho thương hiệu Việt Nam. Đề xuất CHIẾN LƯỢC NỘI DUNG cho campaign sau:

Brand: ${brandName || "(chưa rõ)"}
Ngành: ${industry || "(chưa rõ)"}
Tone of voice: ${toneOfVoice || "(chưa rõ)"}
Positioning: ${brandPositioning || "(chưa rõ)"}
Target audience: ${targetAudience || "(chưa rõ)"}

Campaign: ${title || "(chưa đặt tên)"}
Mô tả: ${description || "(không có)"}
Mục tiêu (primary đầu tiên): ${objectivesLabel}
Kênh: ${channelsLabel}
Thời gian: ${durationDays} ngày

Yêu cầu:
1. Gợi ý 3–5 KEY MESSAGES (thông điệp chính khách hàng cần nhớ) — ngắn gọn ≤ 60 ký tự, cụ thể, khớp brand voice & objective. KHÔNG generic kiểu "Chất lượng hàng đầu".
2. Gợi ý 1 PRIMARY CTA (lời kêu gọi hành động chính) — 2–4 từ, mạnh, phù hợp objective ${primary}.
3. Reasoning: 1 câu ngắn giải thích tại sao chọn bộ thông điệp & CTA này.

CHỈ trả về JSON hợp lệ theo shape:
{
  "key_messages": ["...", "...", "..."],
  "primary_cta": "...",
  "reasoning": "..."
}`;

    let keyMessages: string[] = [];
    let primaryCta = "";
    let aiReasoning = "";

    try {
      const aiResult = await callAI({
        functionName: "suggest-strategy",
        organizationId,
        messages: [{ role: "user", content: prompt }],
        temperatureOverride: 0.7,
        maxTokensOverride: 600,
      } as any);

      if (aiResult?.success) {
        const content = aiResult.data?.choices?.[0]?.message?.content || "";
        let parsed: any = null;
        try { parsed = JSON.parse(content); }
        catch {
          const m = content.match(/\{[\s\S]*\}/);
          if (m) { try { parsed = JSON.parse(m[0]); } catch { /* ignore */ } }
        }
        if (parsed) {
          if (Array.isArray(parsed.key_messages)) {
            keyMessages = parsed.key_messages
              .filter((m: unknown) => typeof m === "string")
              .map((m: string) => m.trim().slice(0, 80))
              .filter((m: string) => m.length > 0)
              .slice(0, 5);
          }
          if (typeof parsed.primary_cta === "string") {
            primaryCta = parsed.primary_cta.trim().slice(0, 40);
          }
          if (typeof parsed.reasoning === "string") {
            aiReasoning = parsed.reasoning.trim().slice(0, 200);
          }
        }
      } else {
        const errMsg = aiResult?.error || "";
        if (errMsg.includes("429")) {
          return new Response(
            JSON.stringify({ error: "AI quá tải, thử lại sau", errorCode: "RATE_LIMIT" }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        if (errMsg.includes("402")) {
          return new Response(
            JSON.stringify({ error: "Hết AI credits", errorCode: "CREDITS_EXHAUSTED" }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        console.warn("[suggest-strategy] AI failed, using fallback:", errMsg);
      }
    } catch (e) {
      console.warn("[suggest-strategy] AI exception, using fallback:", (e as Error).message);
    }

    // Fallback nếu AI không trả về gì → dùng generic theo objective
    if (keyMessages.length === 0) {
      keyMessages = ["Giải pháp đáng tin cậy", "Kết quả nhanh — minh bạch", "Hỗ trợ tận tâm"];
    }
    if (!primaryCta) {
      const ctaMap: Record<string, string> = {
        awareness: "Tìm hiểu ngay",
        engagement: "Tham gia ngay",
        traffic: "Đọc thêm",
        leads: "Nhận tư vấn",
        conversion: "Đặt hàng ngay",
        revenue: "Mua ngay",
        retention: "Gia hạn ngay",
        community: "Tham gia cộng đồng",
      };
      primaryCta = ctaMap[primary] || "Tìm hiểu thêm";
    }

    const reasoning = aiReasoning ||
      `Chiến lược ưu tiên "${primary}" với phân bổ ngân sách ${budgetAllocation.content}% nội dung, ${budgetAllocation.ads}% ads, ${budgetAllocation.kol}% KOL. Mục tiêu ~${totalPostsTarget} bài trong ${durationDays} ngày.`;

    return new Response(
      JSON.stringify({
        key_messages: keyMessages,
        primary_cta: primaryCta,
        budget_allocation: budgetAllocation,
        pillar_allocation: pillarAllocation,
        total_posts_target: totalPostsTarget,
        reasoning,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[suggest-strategy] Error:", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message || "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
