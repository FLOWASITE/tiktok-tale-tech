import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { carouselId, slideImageUrls } = await req.json();

    if (!carouselId || !slideImageUrls || slideImageUrls.length < 2) {
      return new Response(
        JSON.stringify({ consistent: true, overallScore: 100, message: "Not enough slides to validate" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: "AI API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[validate-seamless] Validating ${slideImageUrls.length} slides for carousel ${carouselId}`);

    // Build vision prompt with all slide images
    const analysisPrompt = `Analyze these ${slideImageUrls.length} images as a panoramic carousel sequence placed side by side from left to right.

For each image, extract:
1. Top 5 dominant colors (hex codes)
2. Overall brightness (0-100)
3. Color temperature (warm/neutral/cool)

Then evaluate CONSISTENCY across all images:
- colorScore (0-100): Do they share the same dominant colors?
- brightnessScore (0-100): Is brightness level similar across images?
- temperatureScore (0-100): Is color temperature similar?
- overallScore (0-100): Would these look like one panoramic image when placed side by side?

Respond ONLY in valid JSON (no markdown):
{
  "slides": [{"dominantColors": ["#hex1","#hex2"], "brightness": 70, "temperature": "warm"}],
  "consistency": {
    "colorScore": 80,
    "brightnessScore": 75,
    "temperatureScore": 90,
    "overallScore": 80,
    "issues": ["description of inconsistency if any"],
    "suggestion": "what to regenerate if score < 60"
  }
}`;

    const content: any[] = slideImageUrls.map((url: string) => ({
      type: "image_url" as const,
      image_url: { url },
    }));
    content.push({ type: "text", text: analysisPrompt });

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content }],
        max_tokens: 1500,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("[validate-seamless] AI error:", aiResponse.status, errText);
      return new Response(
        JSON.stringify({ error: "AI validation failed", details: errText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const rawText = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from response (strip markdown fences if present)
    let analysis: any;
    try {
      const jsonStr = rawText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      analysis = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error("[validate-seamless] Failed to parse AI response:", rawText);
      return new Response(
        JSON.stringify({ error: "Could not parse AI analysis", rawResponse: rawText.slice(0, 500) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const overallScore = analysis?.consistency?.overallScore ?? null;

    // Save to DB (non-blocking)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    supabase
      .from("carousels")
      .update({
        seamless_consistency_score: overallScore,
        seamless_analysis: analysis,
      })
      .eq("id", carouselId)
      .then(({ error }) => {
        if (error) console.warn("[validate-seamless] DB update failed:", error.message);
        else console.log(`[validate-seamless] Saved score ${overallScore} for carousel ${carouselId}`);
      });

    return new Response(
      JSON.stringify({
        success: true,
        carouselId,
        ...analysis,
        consistent: (overallScore ?? 100) >= 60,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[validate-seamless] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
