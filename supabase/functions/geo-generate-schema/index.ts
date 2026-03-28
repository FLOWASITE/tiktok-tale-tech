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
    const { contentText, schemaType, brandName, organizationId } = await req.json();
    if (!contentText) throw new Error("contentText is required");

    const prompt = `Generate a valid JSON-LD schema markup for this content.

Schema type: ${schemaType || "Article"}
Brand/Author: ${brandName || "Unknown"}

Content:
${contentText.substring(0, 3000)}

Rules:
- Return ONLY valid JSON-LD code (no markdown, no explanation)
- Include @context, @type, and all relevant properties
- For Article: include headline, description, author, datePublished, image (placeholder)
- For FAQPage: extract Q&A pairs from content
- For HowTo: extract steps from content  
- For Product: extract product details
- Use Vietnamese content as-is, do not translate`;

    // Use centralized callAI — respects Admin model config & auto-fallback
    const result = await callAI({
      functionName: "geo-generate-schema",
      organizationId,
      messages: [
        { role: "system", content: "You are a JSON-LD schema markup generator. Return only valid JSON-LD code." },
        { role: "user", content: prompt },
      ],
    });

    if (!result.success) {
      const isCredits = result.error?.includes("402") || result.error?.includes("Payment");
      if (isCredits) {
        return new Response(JSON.stringify({ error: "Hết credits AI", errorCode: "CREDITS_EXHAUSTED" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (result.error?.includes("429") || result.error?.includes("Rate limit")) {
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(result.error || "AI call failed");
    }

    let jsonLd = result.data?.choices?.[0]?.message?.content || "";

    // Clean markdown code blocks if present
    jsonLd = jsonLd.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    // Validate JSON
    try {
      JSON.parse(jsonLd);
    } catch {
      throw new Error("AI returned invalid JSON-LD");
    }

    console.log(`[geo-generate-schema] Generated via ${result.provider}/${result.model}`);

    return new Response(
      JSON.stringify({ success: true, json_ld: jsonLd, schema_type: schemaType || "Article" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("geo-generate-schema error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
