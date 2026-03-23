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
    const { contentText, schemaType, brandName } = await req.json();
    if (!contentText) throw new Error("contentText is required");

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");

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

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "You are a JSON-LD schema markup generator. Return only valid JSON-LD code." },
          { role: "user", content: prompt },
        ],
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
    let jsonLd = aiData.choices?.[0]?.message?.content || "";

    // Clean markdown code blocks if present
    jsonLd = jsonLd.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    // Validate JSON
    try {
      JSON.parse(jsonLd);
    } catch {
      throw new Error("AI returned invalid JSON-LD");
    }

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
