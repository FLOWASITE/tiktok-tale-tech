// ============================================
// generate-product-image
// Clone of generate-character-image — adapted for product packaging consistency.
// Auto-upgrades to identity-lock edit model when reference image present.
// ============================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getAIConfig } from "../_shared/ai-config.ts";
import { generateImageViaPoyo, isPoyoModel, mapAspectRatioToPoyo } from "../_shared/poyo-image-generator.ts";
import { generateImageViaGeminiGen, isGeminiGenModel, mapAspectRatioToGeminiGen } from "../_shared/geminigen-image-generator.ts";
import { generateImageViaKie, isKieModel, mapAspectRatioToKie } from "../_shared/kie-image-generator.ts";
import { generateImageViaNineRouter, isNineRouterImageModel } from "../_shared/ninerouter-image-generator.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VIEW_LABELS: Record<string, string> = {
  front: "front view of the product, full label visible, centered, studio lighting",
  back: "back view of the product, showing back label and ingredients/specs panel",
  side: "side profile view of the product, showing depth and shape",
  "in-use": "the product being used in a realistic lifestyle scene, hand interaction, soft natural light",
  packaging: "the product with its packaging box / outer carton, retail-ready presentation",
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
    const {
      name,
      appearance = {},
      description = "",
      category = "",
      view = "front",
      organization_id,
      reference_image_url = "",
      preferred_edit_model = "",
    } = body;
    const hasRef = typeof reference_image_url === 'string' && reference_image_url.trim().length > 0;

    if (!name || !organization_id) {
      return new Response(JSON.stringify({ error: "name và organization_id là bắt buộc" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const traits: string[] = [];
    if (appearance.color) traits.push(`color ${appearance.color}`);
    if (appearance.material) traits.push(`material ${appearance.material}`);
    if (appearance.size) traits.push(`size ${appearance.size}`);
    if (category) traits.push(`category ${category}`);

    const viewHint = VIEW_LABELS[view] || VIEW_LABELS.front;

    const basePrompt = hasRef
      ? `Use the attached input photo as the EXACT product reference for "${name}".
KEEP THE EXACT SAME packaging, label text, brand mark, logo, color, shape, and material as the reference photo.
Re-render the SAME product in a NEW shot:
Product traits: ${traits.join(", ") || "consumer product"}.
${appearance.distinctive_features ? `Distinctive features: ${appearance.distinctive_features}.` : ""}
${description ? `Notes: ${description.slice(0, 200)}` : ""}
Shot: ${viewHint}.
Style: high-end commercial product photography, soft studio lighting, neutral light gray background, sharp focus, realistic material textures, professional e-commerce quality. Do NOT alter the label text or logo. No watermark.`
      : `Create a photorealistic studio product photograph of "${name}".
Product traits: ${traits.join(", ") || "consumer product"}.
${appearance.distinctive_features ? `Distinctive features: ${appearance.distinctive_features}.` : ""}
${description ? `Notes: ${description.slice(0, 200)}` : ""}
Shot: ${viewHint}.
Style: high-end commercial product photography, soft studio lighting, neutral light gray background, sharp focus, realistic material textures, professional e-commerce quality. No watermark, no extra text overlays.`;

    const prompt = basePrompt;

    const aiConfig = await getAIConfig('generate-product-image', organization_id);
    const adminModel = aiConfig.model || 'google/gemini-2.5-flash-image';

    const isEditCapable = (m: string) =>
      /seedream.*edit|flux-kontext|nano-banana-pro|gpt-image.*edit|gemini-3-pro-image|gemini-3\.1-flash-image/i.test(m);

    let model = adminModel;
    if (hasRef) {
      if (preferred_edit_model && typeof preferred_edit_model === 'string') {
        model = preferred_edit_model;
      } else if (!isEditCapable(adminModel)) {
        const POYO_KEY = Deno.env.get('POYO_API_KEY');
        if (POYO_KEY) {
          model = 'poyo/seedream-5.0-lite-edit';
        } else {
          model = 'google/gemini-3-pro-image-preview';
        }
      }
    }
    console.log(`[generate-product-image] user=${user.id} name="${name}" view=${view} hasRef=${hasRef} adminModel=${adminModel} chosenModel=${model}`);

    let imageUrl: string | null = null;

    try {
      if (isPoyoModel(model)) {
        const POYO_KEY = Deno.env.get("POYO_API_KEY");
        if (!POYO_KEY) throw new Error("POYO_API_KEY chưa cấu hình");
        imageUrl = await generateImageViaPoyo({
          prompt, model, aspectRatio: mapAspectRatioToPoyo('1:1'),
          inputImage: hasRef ? reference_image_url : undefined,
        }, POYO_KEY);
      } else if (isGeminiGenModel(model)) {
        const GG_KEY = Deno.env.get("GEMINIGEN_API_KEY");
        if (!GG_KEY) throw new Error("GEMINIGEN_API_KEY chưa cấu hình");
        imageUrl = await generateImageViaGeminiGen({
          prompt, model,
          aspectRatio: mapAspectRatioToGeminiGen('1:1'),
          resolution: '1K', maxAttempts: 35,
          inputImage: hasRef ? reference_image_url : undefined,
        }, GG_KEY);
      } else if (isKieModel(model)) {
        const KIE_KEY = Deno.env.get("KIE_API_KEY");
        if (!KIE_KEY) throw new Error("KIE_API_KEY chưa cấu hình");
        imageUrl = await generateImageViaKie({
          prompt, model, aspectRatio: mapAspectRatioToKie('1:1'),
          inputImage: hasRef ? reference_image_url : undefined,
        }, KIE_KEY);
      } else {
        const userContent: any = hasRef
          ? [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: reference_image_url } },
            ]
          : prompt;
        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: userContent }],
            modalities: ["image", "text"],
          }),
        });
        if (!aiResp.ok) {
          const errText = await aiResp.text();
          console.error(`[generate-product-image] AI ${aiResp.status}:`, errText);
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
          throw new Error(`Gateway ${aiResp.status}: ${errText.slice(0, 200)}`);
        }
        const aiData = await aiResp.json();
        imageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url ?? null;
      }
    } catch (genErr) {
      const msg = genErr instanceof Error ? genErr.message : String(genErr);
      console.error(`[generate-product-image] Provider error (model=${model}):`, msg);
      return new Response(JSON.stringify({ error: `AI tạo ảnh thất bại: ${msg}` }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "AI không trả về ảnh, thử lại sau." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let bytes: Uint8Array;
    if (imageUrl.startsWith("data:")) {
      const base64 = imageUrl.split(",")[1];
      bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    } else {
      const imgResp = await fetch(imageUrl);
      if (!imgResp.ok) {
        return new Response(JSON.stringify({ error: `Không tải được ảnh từ provider (${imgResp.status})` }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      bytes = new Uint8Array(await imgResp.arrayBuffer());
    }
    const path = `${organization_id}/${crypto.randomUUID()}.png`;

    const { error: upErr } = await supabase.storage
      .from("product-references")
      .upload(path, bytes, { contentType: "image/png", upsert: false });
    if (upErr) {
      console.error(`[generate-product-image] Upload error:`, upErr);
      return new Response(JSON.stringify({ error: "Không lưu được ảnh vào storage" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { publicUrl } } = supabase.storage.from("product-references").getPublicUrl(path);

    return new Response(JSON.stringify({ url: publicUrl, label: view }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[generate-product-image] Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
