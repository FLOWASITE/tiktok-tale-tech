import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { productName, description, category, industry } = await req.json();

    if (!productName && !description) {
      return new Response(
        JSON.stringify({ error: "productName or description is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a marketing USP expert. Always respond with valid JSON arrays only." },
          { role: "user", content: prompt },
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";

    // Parse the JSON array from AI response
    let suggestions: string[] = [];
    try {
      // Strip markdown code blocks if present
      const cleaned = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      suggestions = JSON.parse(cleaned);
      if (!Array.isArray(suggestions)) {
        suggestions = [];
      }
    } catch {
      console.error("Failed to parse AI suggestions:", content);
      suggestions = [];
    }

    return new Response(
      JSON.stringify({ suggestions }),
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
