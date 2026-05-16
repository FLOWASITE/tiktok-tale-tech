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
  front: "front-facing portrait, head and shoulders, looking directly at camera",
  side: "side profile portrait, head turned 90 degrees",
  "full-body": "full body shot, standing pose, head to toe visible",
  "close-up": "extreme close-up of the face, sharp focus on facial features",
  outfit: "medium shot showing the outfit clearly, three-quarter view",
};

function isRetryableGeminiGenPortraitError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("unknown geminigen generation error") ||
    m.includes("geminigen generation failed") ||
    m.includes("timeout")
  ) && !m.includes("auth") && !m.includes("credits") && !m.includes("rate_limit");
}

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
    const { name, appearance = {}, wardrobe = "", description = "", view = "front", organization_id, reference_image_url = "", preferred_edit_model = "" } = body;
    const hasRef = typeof reference_image_url === 'string' && reference_image_url.trim().length > 0;

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

    const basePrompt = hasRef
      ? `Use the attached input photo as the IDENTITY REFERENCE for a fictional adult Vietnamese marketing character named "${name}" (do NOT render the name or any text in the image).
KEEP THE EXACT SAME face, facial features, hair color & style, skin tone, and body proportions as the reference photo.
Re-render this same person in a NEW shot:
Subject traits: ${traits.join(", ") || "adult person"}.
${appearance.distinctive_features ? `Distinctive features: ${appearance.distinctive_features}.` : ""}
${wardrobe ? `Wardrobe: ${wardrobe}.` : ""}
${description ? `Notes: ${description}` : ""}
Shot: ${viewHint}.
Style: high-end commercial photography, soft natural lighting, neutral light gray background, sharp focus, realistic skin texture, professional headshot quality. No text, no watermark, no logo. Fictional non-celebrity adult.`
      : `Create a photorealistic studio portrait of a fictional adult Vietnamese marketing character.
Character display name: "${name}" (do not render the name or any text in the image).
Subject: ${traits.join(", ") || "adult person"}.
${appearance.distinctive_features ? `Distinctive features: ${appearance.distinctive_features}.` : ""}
${wardrobe ? `Wardrobe: ${wardrobe}.` : ""}
${description ? `Notes: ${description}` : ""}
Shot: ${viewHint}.
Safety and identity: fictional non-celebrity adult, not a real public figure, respectful professional appearance.
Style: high-end commercial photography, soft natural lighting, neutral light gray background, sharp focus, realistic skin texture, professional headshot quality. No text, no watermark, no logo.`;

    const prompt = basePrompt;

    const compactGeminiGenPrompt = hasRef
      ? `Re-render the SAME person from the input photo (keep identical face, hair, skin). New shot: ${viewHint}. ${wardrobe ? `Wardrobe: ${wardrobe}.` : ""} ${appearance.distinctive_features ? `Features: ${appearance.distinctive_features}.` : ""} Neutral light gray background, soft natural lighting, realistic skin, no text, no watermark.`
      : `Photorealistic professional studio headshot of a fictional adult Vietnamese character, ${traits.join(", ") || "adult person"}. ${wardrobe ? `Wardrobe: ${wardrobe}.` : ""} ${appearance.distinctive_features ? `Features: ${appearance.distinctive_features}.` : ""} ${viewHint}. Neutral light gray background, soft natural lighting, realistic skin, non-celebrity, no text, no watermark.`;

    const aiConfig = await getAIConfig('generate-character-image', organization_id);
    const adminModel = aiConfig.model || 'google/gemini-2.5-flash-image';

    // When ref image present → upgrade to a dedicated edit/identity-lock model
    // for stronger character consistency. Priority order:
    //   1) explicit client preferred_edit_model (user pick)
    //   2) admin override if it's already an edit-capable model
    //   3) auto-pick first available edit model with API key configured
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
    console.log(`[generate-character-image] user=${user.id} name="${name}" view=${view} hasRef=${hasRef} adminModel=${adminModel} chosenModel=${model}`);

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
        try {
          imageUrl = await generateImageViaGeminiGen({
            prompt,
            model,
            aspectRatio: mapAspectRatioToGeminiGen('1:1'),
            resolution: '1K',
            maxAttempts: 35,
            inputImage: hasRef ? reference_image_url : undefined,
          }, GG_KEY);
        } catch (firstErr) {
          const firstMsg = firstErr instanceof Error ? firstErr.message : String(firstErr);
          if (!isRetryableGeminiGenPortraitError(firstMsg)) throw firstErr;
          console.warn(`[generate-character-image] GeminiGen portrait failed once, retrying same model with compact safe prompt: ${firstMsg}`);
          imageUrl = await generateImageViaGeminiGen({
            prompt: compactGeminiGenPrompt,
            model,
            aspectRatio: mapAspectRatioToGeminiGen('1:1'),
            resolution: '1K',
            maxAttempts: 35,
            inputImage: hasRef ? reference_image_url : undefined,
          }, GG_KEY);
        }
      } else if (isKieModel(model)) {
        const KIE_KEY = Deno.env.get("KIE_API_KEY");
        if (!KIE_KEY) throw new Error("KIE_API_KEY chưa cấu hình");
        imageUrl = await generateImageViaKie({
          prompt, model, aspectRatio: mapAspectRatioToKie('1:1'),
          inputImage: hasRef ? reference_image_url : undefined,
        }, KIE_KEY);
      } else {
        // Lovable Gateway (google/* models) — supports image edit via image_url in messages
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
          throw new Error(`Gateway ${aiResp.status}: ${errText.slice(0, 200)}`);
        }
        const aiData = await aiResp.json();
        imageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url ?? null;
      }
    } catch (genErr) {
      const msg = genErr instanceof Error ? genErr.message : String(genErr);
      console.error(`[generate-character-image] Provider error (model=${model}):`, msg);
      if (msg.includes('GEMINIGEN_CREDITS_EXHAUSTED')) {
        return new Response(JSON.stringify({ error: "GeminiGen đã hết credits. Vui lòng nạp thêm hoặc đổi cấu hình model.", errorCode: 'CREDITS_EXHAUSTED', model }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (msg.includes('GEMINIGEN_RATE_LIMIT')) {
        return new Response(JSON.stringify({ error: "GeminiGen đang giới hạn tốc độ, thử lại sau ít phút.", errorCode: 'RATE_LIMIT', model }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `AI tạo ảnh thất bại: ${msg}` }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "AI không trả về ảnh, thử lại sau." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert to bytes (support both data URI and remote URL)
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
