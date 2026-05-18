// ============================================
// analyze-product-image — Gemini Vision auto-fill for products
// ============================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getGatewayConfig } from "../_shared/lovable-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { image_url } = await req.json();
    if (!image_url) {
      return new Response(JSON.stringify({ error: "image_url is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const LOVABLE_API_KEY = getGatewayConfig().apiKey;
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch(getGatewayConfig().url, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this product photo. Return Vietnamese-friendly text. Identify name (if readable on label), category, color, material, size, distinctive features, and 3 suggested USP bullets.`,
            },
            { type: "image_url", image_url: { url: image_url } },
          ],
        }],
        tools: [{
          type: "function",
          function: {
            name: "analyze_product",
            description: "Extract product details from an image",
            parameters: {
              type: "object",
              properties: {
                name_suggestion: { type: "string" },
                category: { type: "string" },
                color: { type: "string" },
                material: { type: "string" },
                size: { type: "string" },
                distinctive_features: { type: "string" },
                description: { type: "string" },
                suggested_usp: { type: "array", items: { type: "string" } },
              },
              required: ["color", "description"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "analyze_product" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("[analyze-product-image] AI error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let result: any;
    if (toolCall?.function?.arguments) {
      result = JSON.parse(toolCall.function.arguments);
    } else {
      const content = aiData.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) result = JSON.parse(jsonMatch[0]);
      else return new Response(JSON.stringify({ error: "Could not parse AI response" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      name_suggestion: result.name_suggestion || '',
      category: result.category || '',
      appearance: {
        color: result.color || '',
        material: result.material || '',
        size: result.size || '',
        distinctive_features: result.distinctive_features || '',
      },
      description: result.description || '',
      suggested_usp: Array.isArray(result.suggested_usp) ? result.suggested_usp : [],
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[analyze-product-image] Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
