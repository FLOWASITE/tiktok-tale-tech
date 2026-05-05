import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getAIConfig } from "../_shared/ai-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VIEW_LABELS: Record<string, string> = {
  front: "front-facing portrait, head and shoulders, looking directly at camera",
  side: "side profile portrait, head turned 90 degrees",
  "full-body": "full body shot, standing pose, head to toe visible",
  "close-up": "extreme close-up of the face, sharp focus on facial features",
  outfit: "medium shot showing the outfit clearly, three-quarter view",
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

    const body = await req.json();
    const { name, appearance = {}, wardrobe = "", description = "", view = "front", organization_id } = body;

    if (!name || !organization_id) {
      return new Response(JSON.stringify({ error: "name và organization_id là bắt buộc" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify org membership
    const { data: membership } = await supabase
      .from("organization_members")
      .select("id")
      .eq("organization_id", organization_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) {
      return new Response(JSON.stringify({ error: "Không có quyền với workspace này" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build photorealistic portrait prompt
    const traits: string[] = [];
    if (appearance.gender) traits.push(appearance.gender);
    if (appearance.age_range) traits.push(`tuổi ${appearance.age_range}`);
    if (appearance.hair) traits.push(`tóc ${appearance.hair}`);
    if (appearance.skin_tone) traits.push(`da ${appearance.skin_tone}`);
    if (appearance.body_type) traits.push(appearance.body_type);

    const viewHint = VIEW_LABELS[view] || VIEW_LABELS.front;

    const prompt = `Photorealistic studio portrait of a Vietnamese person named "${name}".
Subject: ${traits.join(", ") || "person"}.
${appearance.distinctive_features ? `Distinctive features: ${appearance.distinctive_features}.` : ""}
${wardrobe ? `Wardrobe: ${wardrobe}.` : ""}
${description ? `Notes: ${description}` : ""}
Shot: ${viewHint}.
Style: high-end photography, soft natural lighting, neutral light gray background, sharp focus, 4K, realistic skin texture, professional headshot quality. No text, no watermark, no logo.`;

    const ALLOWED_IMAGE_MODELS = [
      'google/gemini-2.5-flash-image',
      'google/gemini-3-pro-image-preview',
      'google/gemini-3.1-flash-image-preview',
    ];
    const DEFAULT_IMAGE_MODEL = 'google/gemini-2.5-flash-image';
    const aiConfig = await getAIConfig('generate-character-image', organization_id);
    let model = aiConfig.model || DEFAULT_IMAGE_MODEL;
    if (!ALLOWED_IMAGE_MODELS.includes(model)) {
      console.warn(`[generate-character-image] model "${model}" not allowed, fallback to ${DEFAULT_IMAGE_MODEL}`);
      model = DEFAULT_IMAGE_MODEL;
    }
    console.log(`[generate-character-image] user=${user.id} name="${name}" view=${view} model=${model}`);

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error(`[generate-character-image] AI ${aiResp.status}:`, errText);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Quá tải AI, thử lại sau ít phút." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Hết quota AI, vui lòng nạp thêm credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `AI tạo ảnh thất bại (${aiResp.status}): ${errText.slice(0, 200)}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const imageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageUrl || !imageUrl.startsWith("data:")) {
      console.error(`[generate-character-image] No image returned`, JSON.stringify(aiData).slice(0, 500));
      return new Response(JSON.stringify({ error: "AI không trả về ảnh, thử lại sau." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Decode base64 → upload bucket
    const base64 = imageUrl.split(",")[1];
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const path = `${organization_id}/${crypto.randomUUID()}.png`;

    const { error: upErr } = await supabase.storage
      .from("character-references")
      .upload(path, bytes, { contentType: "image/png", upsert: false });
    if (upErr) {
      console.error(`[generate-character-image] Upload error:`, upErr);
      return new Response(JSON.stringify({ error: "Không lưu được ảnh vào storage" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { publicUrl } } = supabase.storage.from("character-references").getPublicUrl(path);

    return new Response(JSON.stringify({ url: publicUrl, label: view }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[generate-character-image] Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
