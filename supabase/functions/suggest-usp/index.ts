import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const { productName, description, category, industry, organizationId } = await req.json();

    if (!productName && !description) {
      return new Response(
        JSON.stringify({ error: "productName or description is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const categoryLabel = category || "không xác định";
    const industryLabel = industry || "không xác định";

    const prompt = `You are a senior marketing strategist specializing in Vietnamese market.
Analyze the following product and suggest exactly 5 powerful, unique selling points (USPs).

Product Name: ${productName || "N/A"}
Description: ${description || "N/A"}
Category: ${categoryLabel}
Industry: ${industryLabel}

RULES:
- Each USP must be specific and measurable when possible (include numbers, timeframes, percentages)
- Avoid generic phrases like "chất lượng tốt", "giá rẻ", "uy tín"
- Follow the USP framework:
  1-2 USPs: Functional benefit (what the product does uniquely)
  1-2 USPs: Emotional benefit (how it makes the customer feel)
  1 USP: Proof point (evidence, certification, data)
- Keep each USP under 50 characters in Vietnamese
- Output in Vietnamese language

Return ONLY a JSON array of 5 strings, no explanation.`;

    const result = await callAI({
      functionName: "suggest-usp",
      organizationId,
      messages: [
        { role: "system", content: "You are a marketing USP expert. Always respond with valid JSON arrays only." },
        { role: "user", content: prompt },
      ],
      temperatureOverride: 0.8,
    });

    if (!result.success) {
      const isRate = result.error?.includes("429") || result.error?.includes("Rate");
      const isPay = result.error?.includes("402") || result.error?.includes("Payment");
      return new Response(
        JSON.stringify({ error: result.error || "AI service error" }),
        {
          status: isPay ? 402 : isRate ? 429 : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const content = result.data?.choices?.[0]?.message?.content || "[]";

    let suggestions: string[] = [];
    try {
      const cleaned = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      suggestions = JSON.parse(cleaned);
      if (!Array.isArray(suggestions)) suggestions = [];
    } catch {
      console.error("Failed to parse AI suggestions:", content);
      suggestions = [];
    }

    return new Response(
      JSON.stringify({ suggestions, modelUsed: `${result.model} (${result.provider})` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("suggest-usp error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
