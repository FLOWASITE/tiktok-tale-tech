import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI } from "../_shared/ai-provider.ts";

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
    const { monitorId } = await req.json();
    if (!monitorId) throw new Error("monitorId required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get monitor config
    const { data: monitor, error: monErr } = await supabase
      .from("geo_brand_monitors")
      .select("*")
      .eq("id", monitorId)
      .single();

    if (monErr || !monitor) throw new Error("Monitor not found");

    const brandName = monitor.brand_name;
    const competitors = (monitor.competitors || []) as string[];
    const keywords = (monitor.keywords || []) as string[];
    const organizationId = monitor.organization_id;

    if (competitors.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No competitors configured", comparison: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build analysis prompt
    const allBrands = [brandName, ...competitors];
    const keywordList = keywords.slice(0, 5).join(", ");

    const analysisPrompt = `Bạn là AI analyst chuyên phân tích mức độ hiển thị thương hiệu trên AI search engines.

Giả sử người dùng hỏi AI về các chủ đề: ${keywordList}

Hãy đánh giá và so sánh khả năng mà các AI engines (ChatGPT, Gemini, Perplexity) sẽ đề cập đến các thương hiệu sau: ${allBrands.join(", ")}

Phân tích dựa trên:
1. Mức độ hiện diện online (website, social media, PR)
2. Authority trong ngành
3. Content quality & quantity
4. Khả năng được AI trích dẫn`;

    const tools = [
      {
        type: "function",
        function: {
          name: "submit_competitive_analysis",
          description: "Submit competitive analysis results",
          parameters: {
            type: "object",
            properties: {
              brands: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    estimated_sov: { type: "number", description: "0-100" },
                    strengths: { type: "array", items: { type: "string" } },
                    weaknesses: { type: "array", items: { type: "string" } },
                    citation_likelihood: { type: "number", description: "0-100" },
                    content_authority: { type: "number", description: "0-100" },
                  },
                  required: ["name", "estimated_sov", "strengths", "weaknesses", "citation_likelihood", "content_authority"],
                },
              },
              opportunities: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    impact: { type: "string", enum: ["high", "medium", "low"] },
                    effort: { type: "string", enum: ["high", "medium", "low"] },
                  },
                  required: ["title", "description", "impact", "effort"],
                },
              },
            },
            required: ["brands", "opportunities"],
            additionalProperties: false,
          },
        },
      },
    ];

    // Use centralized callAI — respects Admin model config & auto-fallback
    const result = await callAI({
      functionName: "geo-track-competitors",
      organizationId,
      messages: [
        { role: "system", content: "Bạn là competitive intelligence analyst." },
        { role: "user", content: analysisPrompt },
      ],
      tools,
      toolChoice: { type: "function", function: { name: "submit_competitive_analysis" } },
    });

    if (!result.success) {
      const isCredits = result.error?.includes("402") || result.error?.includes("Payment");
      if (isCredits) {
        return new Response(JSON.stringify({ error: "Hết credits AI", errorCode: "CREDITS_EXHAUSTED" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (result.error?.includes("429") || result.error?.includes("Rate limit")) {
        return new Response(JSON.stringify({ error: "Rate limited, thử lại sau" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(result.error || "AI call failed");
    }

    const toolCall = result.data?.choices?.[0]?.message?.tool_calls?.[0];

    let analysis = { brands: [], opportunities: [] };
    if (toolCall?.function?.arguments) {
      analysis = JSON.parse(toolCall.function.arguments);
    }

    console.log(`[geo-track-competitors] Analyzed via ${result.provider}/${result.model}`);

    return new Response(
      JSON.stringify({ success: true, ...analysis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("geo-track-competitors error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
