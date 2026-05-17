import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { callAI } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Same ID set as GoalWizard OBJECTIVES
const VALID_IDS = ["awareness", "engagement", "traffic", "leads", "revenue", "retention"] as const;
type ObjId = typeof VALID_IDS[number];

// Conflicts that are hard to achieve in 1 campaign
const HARD_CONFLICTS: Array<[ObjId, ObjId]> = [
  ["awareness", "revenue"],
];

const DEFAULT_KPIS: Record<ObjId, Record<string, number>> = {
  awareness:  { reach: 10000, impressions: 50000 },
  engagement: { engagement_rate: 5, comments: 100 },
  traffic:    { clicks: 5000, ctr: 3 },
  leads:      { form_fills: 200, signups: 100 },
  revenue:    { conversions: 50, roas: 3 },
  retention:  { repeat_rate: 30, nps: 50 },
};

function stripConflicts(primary: ObjId, secondary: ObjId[]): ObjId[] {
  return secondary.filter(s => {
    if (s === primary) return false;
    return !HARD_CONFLICTS.some(([a, b]) =>
      (a === primary && b === s) || (b === primary && a === s)
    );
  });
}

function fallback(description: string): { primary: ObjId; secondary: ObjId[]; reasoning: string } {
  const d = (description || "").toLowerCase();
  if (/bán|mua|đơn|sale|conversion|doanh thu|revenue|roas/.test(d))
    return { primary: "revenue", secondary: ["traffic"], reasoning: "Mô tả nhấn vào bán hàng → ưu tiên Revenue, hỗ trợ bằng Traffic." };
  if (/lead|form|đăng ký|tư vấn|consult/.test(d))
    return { primary: "leads", secondary: ["traffic"], reasoning: "Mô tả nhắc tới thu lead → Leads + Traffic." };
  if (/ra mắt|launch|giới thiệu|nhận biết|brand awareness/.test(d))
    return { primary: "awareness", secondary: ["engagement"], reasoning: "Mô tả là ra mắt → Awareness + Engagement." };
  return { primary: "engagement", secondary: ["awareness"], reasoning: "Mặc định cân bằng tương tác và nhận biết." };
}

async function fetchRecentObjectives(
  supabase: any,
  brandTemplateId?: string,
  organizationId?: string,
): Promise<{ avoidPrimary: Set<ObjId>; recentSignatures: string[] }> {
  const avoidPrimary = new Set<ObjId>();
  const recentSignatures: string[] = [];
  try {
    let q = supabase
      .from("agent_goals")
      .select("objectives, name, created_at")
      .order("created_at", { ascending: false })
      .limit(3);
    if (brandTemplateId) q = q.eq("brand_template_id", brandTemplateId);
    else if (organizationId) q = q.eq("organization_id", organizationId);
    else return { avoidPrimary, recentSignatures };

    const { data } = await q;
    if (!Array.isArray(data)) return { avoidPrimary, recentSignatures };

    const counts = new Map<ObjId, number>();
    for (const row of data as any[]) {
      const objs = Array.isArray(row?.objectives) ? row.objectives : [];
      const primary = String(objs[0] || "").toLowerCase() as ObjId;
      if (VALID_IDS.includes(primary)) {
        counts.set(primary, (counts.get(primary) || 0) + 1);
      }
      if (objs.length > 0) recentSignatures.push(`"${row?.name || "campaign"}" → primary=${objs[0]}, mix=[${objs.join(", ")}]`);
    }
    // Avoid primary that appeared in ≥2 of last 3 campaigns
    for (const [id, n] of counts) if (n >= 2) avoidPrimary.add(id);
  } catch { /* ignore */ }
  return { avoidPrimary, recentSignatures };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const title: string = body.title || "";
    const description: string = body.description || "";
    const channels: string[] = Array.isArray(body.channels) ? body.channels : [];
    const brandTemplateId: string | undefined = body.brand_template_id;
    const organizationId: string | undefined = body.organization_id;
    let brandName: string = body.brand_name || "";
    let industry: string = body.industry || "";

    if (!description?.trim() && !title?.trim()) {
      return new Response(
        JSON.stringify({ error: "Cần có tên hoặc mô tả chiến dịch để AI gợi ý" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Enrich brand context if missing
    if (brandTemplateId && (!brandName || !industry)) {
      try {
        const { data: brand } = await supabase
          .from("brand_templates")
          .select("brand_name, industry")
          .eq("id", brandTemplateId)
          .single();
        if (brand) {
          brandName = brandName || brand.brand_name || "";
          industry = industry || brand.industry || "";
        }
      } catch { /* ignore */ }
    }

    // Diversity: recent campaign objectives
    const { avoidPrimary, recentSignatures } = await fetchRecentObjectives(
      supabase, brandTemplateId, organizationId,
    );
    const jitterSeed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;

    const channelList = channels.join(", ") || "chưa chọn";
    const fb = fallback(description || title);
    const recentBlock = recentSignatures.length > 0
      ? recentSignatures.map((s, i) => `- [${i + 1}] ${s}`).join("\n")
      : "(chưa có campaign trước)";
    const avoidList = avoidPrimary.size > 0 ? Array.from(avoidPrimary).join(", ") : "(không có)";

    const prompt = `You are a senior marketing strategist. Suggest the BEST marketing objectives for this campaign. Each call must reflect THIS campaign's specifics — do NOT default to the same objective every time.

Campaign: "${title}"
Description: "${description || "(no extra description)"}"
Brand: "${brandName || "(unknown)"}"
Industry: "${industry || "(unknown)"}"
Target channels: ${channelList}
Run seed: ${jitterSeed} (use to ensure variation across calls)

DIVERSITY CONTEXT — 3 campaigns gần nhất của brand:
${recentBlock}
→ Primary objective BỊ LẠM DỤNG (xuất hiện ≥2 lần gần đây): ${avoidList}
→ Nếu mô tả campaign mới không bắt buộc primary đó, hãy chọn primary KHÁC để đa dạng hoá.

Available objective IDs (pick from this list only):
- awareness   → brand reach, impressions
- engagement  → likes, comments, shares
- traffic     → clicks to website
- leads       → form fills, sign-ups
- revenue     → sales, conversions
- retention   → repeat buyers, NPS

RULES:
1. Pick 1 PRIMARY (most aligned with the campaign intent) + 0 to 2 SECONDARY objectives.
2. Total max 3. Secondary must NOT include primary.
3. AVOID hard conflict pair (awareness + revenue) in same campaign (cold audience won't convert).
4. Suggest realistic KPI numbers based on industry norms — không copy preset y nguyên, scale theo channel mix & duration nếu hợp lý.
5. Reasoning ≤200 chars, tiếng Việt, giải thích tại sao primary này fit campaign cụ thể (nhắc tới context).

Return ONLY valid JSON:
{
  "primary": "<id>",
  "secondary": ["<id>", ...],
  "kpis": { "<kpi_key>": <number>, ... },
  "reasoning": "..."
}

KPI keys reference:
  awareness: reach, impressions
  engagement: engagement_rate, comments
  traffic: clicks, ctr
  leads: form_fills, signups
  revenue: conversions, roas
  retention: repeat_rate, nps
`;

    const aiResult = await callAI({
      functionName: "suggest-objectives",
      organizationId,
      messages: [{ role: "user", content: prompt }],
      temperatureOverride: 0.85,
      maxTokensOverride: 600,
    });

    let parsed: any = null;
    let aiPowered = false;
    if (aiResult.success) {
      const content = aiResult.data?.choices?.[0]?.message?.content || "";
      try {
        parsed = JSON.parse(content);
      } catch {
        const m = content.match(/\{[\s\S]*\}/);
        if (m) {
          try { parsed = JSON.parse(m[0]); } catch { /* ignore */ }
        }
      }
    } else {
      console.error("[suggest-objectives] AI error:", aiResult.error);
    }

    let primary: ObjId;
    let secondary: ObjId[];
    let kpis: Record<string, number> = {};
    let reasoning = "";

    if (parsed && VALID_IDS.includes(parsed.primary)) {
      primary = parsed.primary as ObjId;
      const rawSec: ObjId[] = Array.isArray(parsed.secondary)
        ? parsed.secondary.filter((s: any) => VALID_IDS.includes(s))
        : [];
      secondary = stripConflicts(primary, rawSec).slice(0, 2);
      reasoning = typeof parsed.reasoning === "string" ? parsed.reasoning.slice(0, 240) : "";
      if (parsed.kpis && typeof parsed.kpis === "object") {
        for (const [k, v] of Object.entries(parsed.kpis)) {
          if (typeof v === "number" && v >= 0) kpis[k] = v;
        }
      }
      aiPowered = true;
    } else {
      primary = fb.primary;
      secondary = fb.secondary;
      reasoning = fb.reasoning + " (fallback)";
    }

    // Fill default KPIs for selected objectives if AI missed any
    for (const id of [primary, ...secondary]) {
      const defaults = DEFAULT_KPIS[id];
      for (const [k, v] of Object.entries(defaults)) {
        if (kpis[k] === undefined) kpis[k] = v;
      }
    }

    return new Response(
      JSON.stringify({
        primary,
        secondary,
        objectives: [primary, ...secondary],
        kpis,
        reasoning,
        ai_powered: aiPowered,
        diversity: {
          recent_count: recentSignatures.length,
          avoided_primary: Array.from(avoidPrimary),
          seed: jitterSeed,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[suggest-objectives] Error:", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message || "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
