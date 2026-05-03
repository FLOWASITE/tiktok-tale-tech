import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { callAI } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const clusterId: string | undefined = body?.clusterId;
    const selectedKeywordIds: string[] = Array.isArray(body?.selectedKeywordIds)
      ? body.selectedKeywordIds.filter((x: any) => typeof x === 'string')
      : [];
    if (!clusterId) return json({ error: "Missing clusterId" }, 400);

    // Fetch cluster + uncovered keywords
    const { data: cluster } = await supabase
      .from("seo_clusters")
      .select("id, name, description, organization_id, pillar_keyword_id")
      .eq("id", clusterId)
      .maybeSingle();

    if (!cluster) return json({ error: "Cluster not found" }, 404);

    const { data: keywords = [] } = await supabase
      .from("seo_keywords")
      .select("id, keyword, intent, search_volume, difficulty, assigned_landing_page_id")
      .eq("cluster_id", clusterId)
      .order("priority_score", { ascending: false });

    const uncovered = (keywords || []).filter((k: any) => !k.assigned_landing_page_id);
    if (uncovered.length === 0) {
      return json({ suggestions: [], message: "Tất cả keyword đã có content" });
    }

    // Fetch a brand for tone context (optional)
    const { data: brand } = await supabase
      .from("brand_templates")
      .select("brand_name, industry, tone_of_voice")
      .eq("organization_id", cluster.organization_id)
      .limit(1)
      .maybeSingle();

    let pillarKw: string | null = null;
    if (cluster.pillar_keyword_id) {
      const { data: pk } = await supabase
        .from("seo_keywords")
        .select("keyword")
        .eq("id", cluster.pillar_keyword_id)
        .maybeSingle();
      pillarKw = pk?.keyword || null;
    }

    const targetSet = new Set(selectedKeywordIds);
    // Sort: target keywords first (preserve priority order within group)
    const ordered = targetSet.size > 0
      ? [
          ...uncovered.filter((k: any) => targetSet.has(k.id)),
          ...uncovered.filter((k: any) => !targetSet.has(k.id)),
        ]
      : uncovered;

    const kwBlock = ordered
      .slice(0, 30)
      .map((k: any, i: number) => {
        const tag = targetSet.has(k.id) ? ' [TARGET]' : '';
        return `${i + 1}. id=${k.id} | "${k.keyword}"${tag} | intent=${k.intent || "n/a"} | vol=${k.search_volume ?? "?"}`;
      })
      .join("\n");

    const targetInstruction = targetSet.size > 0
      ? `\nƯU TIÊN TUYỆT ĐỐI: tập trung phủ trước các keyword được đánh dấu [TARGET] (${targetSet.size} keyword). Mỗi topic gợi ý phải gắn ít nhất 1 keyword [TARGET] nếu có thể.`
      : '';

    const prompt = `Bạn là SEO content strategist. Dựa trên Pillar Cluster sau, đề xuất 5-8 topic bài viết để PHỦ các keyword chưa có content.

PILLAR: ${cluster.name}${pillarKw ? ` (head term: "${pillarKw}")` : ""}
${cluster.description ? `Mô tả: ${cluster.description}` : ""}
${brand ? `Brand: ${brand.brand_name} | Industry: ${brand.industry || "n/a"} | Tone: ${brand.tone_of_voice || "n/a"}` : ""}

KEYWORD CHƯA CÓ CONTENT (uncovered):
${kwBlock}
${targetInstruction}

YÊU CẦU:
- Mỗi topic gắn 1-3 keyword id từ list trên (group keyword cùng intent vào 1 bài)
- Title hấp dẫn, tự nhiên tiếng Việt, có chứa keyword chính
- Angle: 1 câu mô tả góc nhìn của bài (vd: "So sánh", "Hướng dẫn step-by-step", "Case study")
- intent: TOFU (awareness) | MOFU (consideration) | BOFU (decision)
- Ưu tiên keyword volume cao và intent rõ ràng

Trả về CHÍNH XÁC JSON object:
{
  "suggestions": [
    { "title": "...", "angle": "...", "keyword_ids": ["uuid1","uuid2"], "intent": "TOFU|MOFU|BOFU" }
  ]
}`;

    const aiResult = await callAI({
      functionName: "suggest-cluster-topics",
      organizationId: cluster.organization_id,
      messages: [
        { role: "system", content: "Bạn là SEO strategist. Luôn trả lời bằng JSON hợp lệ." },
        { role: "user", content: prompt },
      ],
    } as any);

    const text = aiResult?.data?.choices?.[0]?.message?.content
      || (aiResult as any)?.content
      || aiResult?.data?.content
      || "";
    let parsed: any = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { suggestions: [] };
    }

    const validIds = new Set(uncovered.map((k: any) => k.id));
    const suggestions = (parsed.suggestions || []).map((s: any) => ({
      title: String(s.title || "").slice(0, 200),
      angle: String(s.angle || "").slice(0, 300),
      keyword_ids: (s.keyword_ids || []).filter((id: string) => validIds.has(id)).slice(0, 5),
      intent: ["TOFU", "MOFU", "BOFU"].includes(s.intent) ? s.intent : "MOFU",
    })).filter((s: any) => s.title && s.keyword_ids.length > 0);

    return json({ suggestions, usedTargetIds: Array.from(targetSet) });
  } catch (error: any) {
    console.error("[suggest-cluster-topics] Error:", error);
    return json({ error: error.message }, 500);
  }
});

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
