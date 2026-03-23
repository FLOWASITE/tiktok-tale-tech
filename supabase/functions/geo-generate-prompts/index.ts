import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { monitorId, industry, keywords, brandName, language } = await req.json();
    if (!monitorId) throw new Error("monitorId required");

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // If no keywords provided, fetch from monitor
    let kws = keywords || [];
    let brand = brandName || "";
    let orgId = "";

    if (kws.length === 0) {
      const { data: monitor } = await supabase
        .from("geo_brand_monitors")
        .select("keywords, brand_name, organization_id, competitors")
        .eq("id", monitorId)
        .single();
      if (monitor) {
        kws = monitor.keywords || [];
        brand = monitor.brand_name || "";
        orgId = monitor.organization_id || "";
      }
    }

    const lang = language || "vi";
    const industryCtx = industry || "general";

    const prompt = `Bạn là chuyên gia GEO (Generative Engine Optimization) cho thị trường ${lang === "vi" ? "Việt Nam" : "quốc tế"}.

Ngành: ${industryCtx}
Brand: ${brand}
Keywords gốc: ${kws.join(", ")}

Hãy tạo danh sách 20-30 prompts mà người dùng thực tế sẽ hỏi AI (ChatGPT, Gemini, Perplexity) liên quan đến ngành và keywords trên.

Phân loại mỗi prompt theo intent:
- informational: hỏi thông tin, "X là gì", "cách làm Y"
- commercial: so sánh, đánh giá, "nên chọn X hay Y"
- transactional: mua hàng, đặt dịch vụ, "mua X ở đâu"
- navigational: tìm brand cụ thể, "website X", "liên hệ Y"
- comparison: so sánh trực tiếp 2+ brands

Mỗi prompt phải tự nhiên, giống cách người dùng thực sự hỏi AI. Viết bằng ${lang === "vi" ? "tiếng Việt" : "English"}.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Bạn là GEO prompt generator. Tạo prompts cho AI search monitoring." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "submit_prompts",
            description: "Submit generated prompts",
            parameters: {
              type: "object",
              properties: {
                prompts: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      text: { type: "string" },
                      intent_type: { type: "string", enum: ["informational", "commercial", "transactional", "navigational", "comparison"] },
                      cluster_name: { type: "string", description: "Topic cluster name" },
                    },
                    required: ["text", "intent_type", "cluster_name"],
                  },
                },
              },
              required: ["prompts"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "submit_prompts" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let generatedPrompts: any[] = [];

    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      generatedPrompts = parsed.prompts || [];
    }

    // Insert into geo_prompts (skip duplicates)
    if (generatedPrompts.length > 0 && orgId) {
      const rows = generatedPrompts.map((p: any) => ({
        organization_id: orgId,
        brand_monitor_id: monitorId,
        prompt_text: p.text,
        intent_type: p.intent_type,
        cluster_name: p.cluster_name,
        source: "ai_suggested",
      }));

      const { error: insertErr } = await supabase
        .from("geo_prompts")
        .insert(rows as any[]);
      if (insertErr) console.error("Insert prompts error:", insertErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        prompts_generated: generatedPrompts.length,
        prompts: generatedPrompts,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("geo-generate-prompts error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
