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
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
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

    // Use Gemini Vision to analyze the character image
    const aiResponse = await fetch(getGatewayConfig().url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this person's appearance and return a JSON object with these fields:
{
  "gender": "Nam" or "Nữ" or "Phi nhị nguyên",
  "age_range": one of "18-25", "25-35", "35-45", "45-55", "55+",
  "hair": describe hair style and color in Vietnamese (e.g. "Đen dài", "Nâu ngắn"),
  "skin_tone": one of "Trắng sáng", "Ngăm", "Nâu ấm", "Da ngâm đậm",
  "body_type": describe body type briefly in Vietnamese,
  "distinctive_features": notable features in Vietnamese (glasses, moles, tattoos, etc.),
  "description": a detailed 2-3 sentence description of this person's appearance in Vietnamese,
  "wardrobe": describe what they're wearing in Vietnamese
}
Return ONLY the JSON object, no markdown or explanation.`
              },
              {
                type: "image_url",
                image_url: { url: image_url }
              }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_appearance",
              description: "Extract appearance details from a character image",
              parameters: {
                type: "object",
                properties: {
                  gender: { type: "string", enum: ["Nam", "Nữ", "Phi nhị nguyên"] },
                  age_range: { type: "string", enum: ["18-25", "25-35", "35-45", "45-55", "55+"] },
                  hair: { type: "string" },
                  skin_tone: { type: "string", enum: ["Trắng sáng", "Ngăm", "Nâu ấm", "Da ngâm đậm"] },
                  body_type: { type: "string" },
                  distinctive_features: { type: "string" },
                  description: { type: "string" },
                  wardrobe: { type: "string" },
                },
                required: ["gender", "age_range", "hair", "skin_tone", "description"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analyze_appearance" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("[analyze-character-image] AI error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    let result;
    if (toolCall?.function?.arguments) {
      result = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback: try to parse from content
      const content = aiData.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        return new Response(JSON.stringify({ error: "Could not parse AI response" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({
      appearance: {
        gender: result.gender,
        age_range: result.age_range,
        hair: result.hair,
        skin_tone: result.skin_tone,
        body_type: result.body_type || '',
        distinctive_features: result.distinctive_features || '',
      },
      description: result.description || '',
      wardrobe: result.wardrobe || '',
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("[analyze-character-image] Error:", e);
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
