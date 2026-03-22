import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { withSemanticCache } from "../_shared/cache/semantic-cache.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(withPerf({ functionName: 'improve-script' }, async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { scriptContent, suggestions, weaknesses, topic, duration, videoType, scriptPurpose } = await req.json();

    if (!scriptContent) {
      return new Response(JSON.stringify({ error: "scriptContent is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const suggestionList = (suggestions || [])
      .map((s: any, i: number) => `${i + 1}. [${s.priority}] ${s.message}`)
      .join("\n");

    const weaknessList = (weaknesses || [])
      .map((w: string, i: number) => `${i + 1}. ${w}`)
      .join("\n");

    const systemPrompt = `Bạn là chuyên gia viết kịch bản video ngắn (TikTok, Reels, Shorts). Nhiệm vụ: nhận kịch bản gốc cùng danh sách gợi ý cải thiện, rồi viết lại kịch bản đã cải thiện.

QUY TẮC QUAN TRỌNG:
- GIỮ NGUYÊN FORMAT gốc (Prompt 1, Prompt 2... hoặc Clip 1, Clip 2... hoặc Đoạn 1, Đoạn 2... tùy format gốc)
- GIỮ NGUYÊN SỐ LƯỢNG prompt/clip/đoạn như bản gốc
- Cải thiện NỘI DUNG theo từng gợi ý, KHÔNG thêm bớt cấu trúc
- Giữ nguyên ngôn ngữ tiếng Việt
- CHỈ TRẢ VỀ kịch bản đã cải thiện, KHÔNG giải thích gì thêm`;

    const userPrompt = `KỊCH BẢN GỐC:
${scriptContent}

THÔNG TIN:
- Chủ đề: ${topic || "N/A"}
- Thời lượng: ${duration || "N/A"}s
- Loại video: ${videoType || "N/A"}
- Mục đích: ${scriptPurpose || "N/A"}

GỢI Ý CẢI THIỆN:
${suggestionList || "Không có"}

ĐIỂM YẾU CẦN KHẮC PHỤC:
${weaknessList || "Không có"}

Hãy viết lại kịch bản đã cải thiện theo các gợi ý trên. Giữ nguyên format và cấu trúc gốc.`;

    // Use semantic cache for similar improvement requests
    const supabase = getServiceClient();
    const cacheInputText = `improve:${topic}:${videoType}:${scriptContent.substring(0, 200)}:${suggestionList.substring(0, 200)}`;

    const result = await withSemanticCache(
      supabase,
      cacheInputText,
      { functionName: 'improve-script', similarityThreshold: 0.95 },
      async () => {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
          }),
        });

        if (!response.ok) {
          if (response.status === 429) throw new Error("RATE_LIMIT");
          if (response.status === 402) throw new Error("NO_CREDITS");
          const errText = await response.text();
          console.error("AI gateway error:", response.status, errText);
          throw new Error("AI_GATEWAY_ERROR");
        }

        const data = await response.json();
        const improvedContent = data.choices?.[0]?.message?.content?.trim();
        if (!improvedContent) throw new Error("EMPTY_RESPONSE");
        return { improvedContent };
      },
      3, // TTL 3 days for script improvements
    );

    if (result.fromCache) {
      console.log(`[improve-script] Semantic cache hit (similarity: ${result.similarity?.toFixed(3)})`);
    }

    return new Response(JSON.stringify(result.data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    if (errMsg === "RATE_LIMIT") {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Vui lòng thử lại sau." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (errMsg === "NO_CREDITS") {
      return new Response(JSON.stringify({ error: "Hết credits AI. Vui lòng nạp thêm." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (errMsg === "EMPTY_RESPONSE") {
      return new Response(JSON.stringify({ error: "AI trả về kết quả rỗng. Vui lòng thử lại." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.error("improve-script error:", err);
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
