import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IndustryCandidate {
  id: string;
  code: string;
  name: string;
  shortName: string | null;
  categoryLabel: string | null;
}

interface Suggestion {
  packId: string;
  code: string;
  name: string;
  confidence: number;
  reason: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { brandText, language = "vi" } = await req.json();

    if (!brandText || typeof brandText !== "string" || brandText.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: "brandText quá ngắn" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch active core packs with translation
    const { data: packs, error } = await supabase
      .from("industry_global_packs")
      .select(`
        id,
        industry_code,
        industry_categories ( label ),
        industry_pack_translations!inner ( name, short_name, language_code )
      `)
      .eq("is_active", true)
      .eq("industry_level", "core")
      .eq("industry_pack_translations.language_code", language);

    if (error) throw error;

    const candidates: IndustryCandidate[] = (packs || []).map((p: any) => ({
      id: p.id,
      code: p.industry_code,
      name: p.industry_pack_translations?.[0]?.name || p.industry_code,
      shortName: p.industry_pack_translations?.[0]?.short_name || null,
      categoryLabel: p.industry_categories?.label || null,
    }));

    // Build compact list for prompt
    const list = candidates
      .map((c, i) => `${i + 1}. [${c.code}] ${c.shortName || c.name}${c.categoryLabel ? ` (${c.categoryLabel})` : ""}`)
      .join("\n");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const truncatedBrand = brandText.slice(0, 4000);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "Bạn là chuyên gia phân loại ngành nghề. Đọc thông tin brand và chọn TOP 5 ngành phù hợp nhất từ danh sách (xếp theo độ phù hợp giảm dần, bao gồm cả ngành liên quan/cận kề để user có thêm lựa chọn). Chỉ chọn từ danh sách cho sẵn. Trả về confidence 0-100 (≥80 = rất rõ, 50-79 = khá rõ, 30-49 = liên quan, <30 = xa). Lý do ngắn gọn 1 câu tiếng Việt.",
          },
          {
            role: "user",
            content: `THÔNG TIN BRAND:\n${truncatedBrand}\n\nDANH SÁCH NGÀNH (chỉ chọn từ đây):\n${list}\n\nChọn top 5 ngành phù hợp nhất, ưu tiên ngành chính trước rồi đến ngành liên quan.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_industry_suggestions",
              description: "Trả về top 5 ngành phù hợp (gồm ngành chính + ngành liên quan)",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    minItems: 1,
                    maxItems: 5,
                    items: {
                      type: "object",
                      properties: {
                        code: { type: "string", description: "industry_code chính xác từ danh sách" },
                        confidence: { type: "number", minimum: 0, maximum: 100 },
                        reason: { type: "string", description: "Lý do ngắn 1 câu tiếng Việt" },
                      },
                      required: ["code", "confidence", "reason"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["suggestions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_industry_suggestions" } },
      }),
    });

    if (!aiResponse.ok) {
      const txt = await aiResponse.text();
      console.error("[suggest-industry] AI error:", aiResponse.status, txt);
      // Soft-fail: trả 200 với suggestions rỗng để UI fallback (search thủ công), tránh blank screen
      const errorCode =
        aiResponse.status === 402 ? "CREDITS_EXHAUSTED"
        : aiResponse.status === 429 ? "RATE_LIMIT"
        : `AI_ERROR_${aiResponse.status}`;
      const message =
        aiResponse.status === 402 ? "Hết credit AI Gateway, vui lòng chọn ngành thủ công."
        : aiResponse.status === 429 ? "Quá nhiều yêu cầu, thử lại sau."
        : "AI gợi ý tạm không khả dụng.";
      return new Response(
        JSON.stringify({ suggestions: [], fallback: true, errorCode, error: message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await aiResponse.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall?.function?.arguments
      ? JSON.parse(toolCall.function.arguments)
      : { suggestions: [] };

    const byCode = new Map(candidates.map(c => [c.code, c]));
    const suggestions: Suggestion[] = (args.suggestions || [])
      .map((s: any) => {
        const cand = byCode.get(s.code);
        if (!cand) return null;
        return {
          packId: cand.id,
          code: cand.code,
          name: cand.shortName || cand.name,
          confidence: Math.min(100, Math.max(0, Math.round(s.confidence || 0))),
          reason: String(s.reason || "").slice(0, 200),
        };
      })
      .filter(Boolean)
      .slice(0, 5);

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[suggest-industry] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
