// ============================================
// generate-social-image Edge Function
// Social image generation with KIE.ai routing
// Pattern mirrors generate-brand-image exactly
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAIConfig } from "../_shared/ai-config.ts";
import { generateImageViaKie, isKieModel, mapAspectRatioToKie } from "../_shared/kie-image-generator.ts";
import { generateImageViaPoyo, isPoyoModel, mapAspectRatioToPoyo } from "../_shared/poyo-image-generator.ts";
import {
  buildImagePrompt,
  getChannelAspectRatio,
  computeStyleFromBrand,
  type Channel,
  type BrandImageContext,
  type PersonaContext,
  type ImageStylePreset,
  type ContentRole,
  type ContentAngle,
  type ImageContentType,
  type TextPosition,
  type TypographyStyle,
} from "../_shared/image-prompt-builder.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GenerateSocialImageRequest {
  contentId: string;
  channel: string;
  contentSummary: string;
  brandTemplateId: string;
  aspectRatio?: "16:9" | "1:1" | "9:16" | "4:5";
  journeyStage?: "awareness" | "consideration" | "decision" | "retention";
  contentType?: "promotional" | "educational" | "entertainment" | "inspirational";
  imageStylePreset?: ImageStylePreset;
  negativePrompt?: string;
  contentRole?: ContentRole;
  contentAngle?: ContentAngle;
  hookMessage?: string;
  hookType?: string;
  imageContentType?: ImageContentType;
  textToInclude?: string;
  textPosition?: TextPosition;
  typographyStyle?: TypographyStyle;
}

// Default models when Admin Panel config not available
const DEFAULT_IMAGE_MODELS = {
  primary: "google/gemini-3-pro-image-preview",
  fallback: "google/gemini-2.5-flash-image",
} as const;

const QUALITY_THRESHOLDS = {
  minFileSizeBytes: 10000,
  maxRetries: 2,
} as const;

function mapContentGoalToJourneyStage(
  contentGoal?: string
): "awareness" | "consideration" | "decision" | "retention" | undefined {
  const mapping: Record<string, "awareness" | "consideration" | "decision" | "retention"> = {
    brand_awareness: "awareness",
    engagement: "awareness",
    lead_generation: "consideration",
    traffic: "consideration",
    conversion: "decision",
    sales: "decision",
    retention: "retention",
    loyalty: "retention",
  };
  return contentGoal ? mapping[contentGoal] : undefined;
}

function validateImageQuality(base64Data: string): { valid: boolean; reason?: string; fileSize: number } {
  try {
    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    const fileSize = imageBytes.length;

    if (fileSize < QUALITY_THRESHOLDS.minFileSizeBytes) {
      return {
        valid: false,
        reason: `Image too small (${fileSize} bytes, min ${QUALITY_THRESHOLDS.minFileSizeBytes})`,
        fileSize,
      };
    }

    const sampleSize = Math.min(1000, imageBytes.length);
    let sum = 0;
    let sumSq = 0;
    for (let i = 0; i < sampleSize; i++) {
      const idx = Math.floor((i * imageBytes.length) / sampleSize);
      sum += imageBytes[idx];
      sumSq += imageBytes[idx] * imageBytes[idx];
    }
    const mean = sum / sampleSize;
    const variance = sumSq / sampleSize - mean * mean;

    if (variance < 100) {
      return {
        valid: false,
        reason: `Image appears blank or uniform (variance: ${variance.toFixed(2)})`,
        fileSize,
      };
    }

    return { valid: true, fileSize };
  } catch (err) {
    return { valid: false, reason: `Validation error: ${err}`, fileSize: 0 };
  }
}

async function generateImageWithRetry(
  prompt: string,
  apiKey: string,
  models: { primary: string; fallback: string } = DEFAULT_IMAGE_MODELS,
  maxRetries: number = QUALITY_THRESHOLDS.maxRetries
): Promise<{ imageData: string; model: string; attempts: number }> {
  let lastError: Error | null = null;
  let attempts = 0;

  const modelsToTry = [models.primary, models.fallback];

  for (const model of modelsToTry) {
    for (let retry = 0; retry <= maxRetries; retry++) {
      attempts++;

      try {
        console.log(`[generate-social-image] Attempt ${attempts} with model: ${model}`);

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: prompt }],
            modalities: ["image", "text"],
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[generate-social-image] Model ${model} error:`, response.status, errorText);

          if (response.status === 429 || response.status === 402) {
            throw new Error(`API_ERROR:${response.status}`);
          }

          lastError = new Error(`Model ${model} failed: ${response.status}`);
          continue;
        }

        const aiData = await response.json();
        const imageData = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (!imageData) {
          lastError = new Error(`No image in response from ${model}`);
          continue;
        }

        const base64Data = imageData.replace(/^data:image\/[^;]+;base64,/, "");
        const validation = validateImageQuality(base64Data);

        if (!validation.valid) {
          console.warn(`[generate-social-image] Quality check failed: ${validation.reason}`);
          lastError = new Error(validation.reason || "Quality check failed");

          if (model === models.primary && retry === maxRetries) {
            console.log("[generate-social-image] Primary model exhausted, trying fallback...");
            break;
          }
          continue;
        }

        console.log(`[generate-social-image] Success with ${model}, file size: ${validation.fileSize} bytes`);
        return { imageData, model, attempts };
      } catch (err) {
        if (err instanceof Error && err.message.startsWith("API_ERROR:")) {
          throw err;
        }

        lastError = err instanceof Error ? err : new Error(String(err));
        console.error(`[generate-social-image] Attempt ${attempts} failed:`, lastError.message);

        if (retry < maxRetries) {
          const delay = 1000 * Math.pow(2, retry);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }
  }

  throw lastError || new Error("All generation attempts failed");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const {
      contentId,
      channel,
      contentSummary,
      brandTemplateId,
      aspectRatio,
      journeyStage,
      contentType,
      imageStylePreset,
      negativePrompt,
      contentRole: requestedContentRole,
      contentAngle: requestedContentAngle,
      hookMessage: requestedHookMessage,
      hookType: requestedHookType,
      imageContentType,
      textToInclude,
      textPosition,
      typographyStyle,
    }: GenerateSocialImageRequest = await req.json();

    console.log(`[generate-social-image] Generating for channel: ${channel}, content: ${contentId}`);

    // Fetch brand template
    const { data: brandTemplate, error: brandError } = await supabase
      .from("brand_templates")
      .select(
        "primary_color, secondary_colors, image_style, logo_url, brand_name, industry, organization_id, tone_of_voice, formality_level"
      )
      .eq("id", brandTemplateId)
      .single();

    if (brandError || !brandTemplate) {
      console.error("[generate-social-image] Brand template not found:", brandError);
      throw new Error("Brand template not found");
    }

    // Auto-select style if not provided
    let finalImageStylePreset = imageStylePreset;
    if (!finalImageStylePreset && brandTemplate) {
      finalImageStylePreset = computeStyleFromBrand(
        brandTemplate.industry as string[] | undefined,
        brandTemplate.tone_of_voice as string[] | undefined,
        brandTemplate.image_style as string | undefined,
        brandTemplate.formality_level as string | undefined
      );
      console.log(`[generate-social-image] Auto-selected style: ${finalImageStylePreset}`);
    }

    // Fetch content data for role, angle, and hooks
    let finalJourneyStage = journeyStage;
    let finalContentRole: ContentRole | undefined = requestedContentRole;
    let finalContentAngle: ContentAngle | undefined = requestedContentAngle;
    let finalHookMessage: string | undefined = requestedHookMessage;
    let finalHookType: string | undefined = requestedHookType;

    if (contentId) {
      const { data: contentData } = await supabase
        .from("multi_channel_contents")
        .select("content_goal, content_role, content_angle, selected_hooks, global_hook")
        .eq("id", contentId)
        .single();

      if (contentData) {
        if (!finalJourneyStage && contentData.content_goal) {
          finalJourneyStage = mapContentGoalToJourneyStage(contentData.content_goal);
        }
        if (!finalContentRole && contentData.content_role) {
          finalContentRole = contentData.content_role as ContentRole;
        }
        if (!finalContentAngle && contentData.content_angle) {
          finalContentAngle = contentData.content_angle as ContentAngle;
        }
        if (!finalHookMessage) {
          const selectedHooks = contentData.selected_hooks as any[] | null;
          const channelHook = selectedHooks?.find((h: any) => h.channel === channel);
          if (channelHook?.opening_line) {
            finalHookMessage = channelHook.opening_line;
            finalHookType = channelHook.hook_type || channelHook.framework;
          } else if (contentData.global_hook) {
            const globalHook = contentData.global_hook as any;
            finalHookMessage = globalHook.opening_line;
            finalHookType = globalHook.hook_type || globalHook.framework;
          }
        }
      }
    }

    // Fetch primary persona
    let personaContext: PersonaContext | undefined;
    try {
      const { data: personaMapping } = await supabase
        .from("product_persona_mappings")
        .select(`customer_personas (name, age_range, gender, occupation, interests, communication_style)`)
        .eq("brand_template_id", brandTemplateId)
        .eq("is_primary", true)
        .limit(1)
        .maybeSingle();

      if (personaMapping?.customer_personas) {
        const p = personaMapping.customer_personas as any;
        personaContext = {
          name: p.name,
          ageRange: p.age_range,
          gender: p.gender,
          occupation: p.occupation,
          interests: p.interests,
          communicationStyle: p.communication_style,
        };
      }
    } catch (personaErr) {
      console.warn("[generate-social-image] Failed to fetch persona:", personaErr);
    }

    // Determine aspect ratio
    const finalAspectRatio = aspectRatio || getChannelAspectRatio(channel as Channel);

    // Build brand context
    const brandContext: BrandImageContext = {
      brandName: brandTemplate.brand_name,
      brandColors: {
        primary: brandTemplate.primary_color || "#6366f1",
        secondary: brandTemplate.secondary_colors || [],
      },
      imageStyle: brandTemplate.image_style || "professional, modern, clean",
      logoUrl: brandTemplate.logo_url,
      industry: brandTemplate.industry || [],
    };

    // Build enhanced prompt
    const enhancedPrompt = buildImagePrompt({
      channel: channel as Channel,
      contentSummary,
      brand: brandContext,
      aspectRatio: finalAspectRatio,
      journeyStage: finalJourneyStage,
      contentType,
      persona: personaContext,
      imageStylePreset: finalImageStylePreset,
      negativePrompt,
      contentRole: finalContentRole,
      contentAngle: finalContentAngle,
      hookMessage: finalHookMessage,
      hookType: finalHookType,
      imageContentType,
      textToInclude,
      textPosition,
      typographyStyle,
    });

    // ─── Read model config from Admin Panel ───────────────────────────────────
    const aiConfig = await getAIConfig("generate-social-image", brandTemplate.organization_id);
    const primaryModel = aiConfig.model;
    console.log(`[generate-social-image] Using model from config: ${primaryModel}`);

    // Variables for result
    let imageData: string = "";
    let imageUrlFromKie: string | null = null;
    let imageUrlFromPoyo: string | null = null;
    let modelUsed: string = primaryModel;
    let totalAttempts: number = 1;

    // ─── Route to PoYo.ai, KIE.ai, or Lovable AI based on model prefix ──────
    if (isPoyoModel(primaryModel)) {
      const POYO_API_KEY = Deno.env.get("POYO_API_KEY");
      if (!POYO_API_KEY) {
        return new Response(
          JSON.stringify({ success: false, error: "POYO_API_KEY not configured. Please add it in project secrets." }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[generate-social-image] Routing to PoYo.ai: ${primaryModel}`);
      try {
        imageUrlFromPoyo = await generateImageViaPoyo({
          prompt: enhancedPrompt,
          model: primaryModel,
          aspectRatio: mapAspectRatioToPoyo(finalAspectRatio),
        }, POYO_API_KEY);
        modelUsed = primaryModel;
      } catch (poyoErr) {
        const poyoErrMsg = poyoErr instanceof Error ? poyoErr.message : String(poyoErr);
        console.error(`[generate-social-image] PoYo.ai failed: ${poyoErrMsg}`);

        if (poyoErrMsg.includes("POYO_AUTH_ERROR") || poyoErrMsg.includes("POYO_CREDITS_EXHAUSTED") || poyoErrMsg.includes("POYO_RATE_LIMIT")) {
          return new Response(
            JSON.stringify({ success: false, error: poyoErrMsg }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log("[generate-social-image] PoYo failed, falling back to Lovable AI...");
        const fallbackModel = "google/gemini-2.5-flash-image";
        const result = await generateImageWithRetry(enhancedPrompt, LOVABLE_API_KEY, {
          primary: fallbackModel,
          fallback: "google/gemini-3-pro-image-preview",
        });
        imageData = result.imageData;
        modelUsed = `${result.model} (fallback from ${primaryModel})`;
        totalAttempts = result.attempts;
      }
    } else if (isKieModel(primaryModel)) {
      const KIE_API_KEY = Deno.env.get("KIE_API_KEY");
      if (!KIE_API_KEY) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "KIE_API_KEY not configured. Please add it in project secrets.",
          }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[generate-social-image] Routing to KIE.ai: ${primaryModel}`);
      try {
        imageUrlFromKie = await generateImageViaKie(
          {
            prompt: enhancedPrompt,
            model: primaryModel,
            aspectRatio: mapAspectRatioToKie(finalAspectRatio),
            outputFormat: "jpeg",
          },
          KIE_API_KEY
        );
        modelUsed = primaryModel;
      } catch (kieErr) {
        const kieErrMsg = kieErr instanceof Error ? kieErr.message : String(kieErr);
        console.error(`[generate-social-image] KIE.ai failed: ${kieErrMsg}`);

        if (
          kieErrMsg.includes("KIE_AUTH_ERROR") ||
          kieErrMsg.includes("KIE_CREDITS_EXHAUSTED") ||
          kieErrMsg.includes("KIE_RATE_LIMIT")
        ) {
          return new Response(
            JSON.stringify({ success: false, error: kieErrMsg }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log("[generate-social-image] KIE failed, falling back to Lovable AI...");
        const fallbackModel = "google/gemini-2.5-flash-image";
        const result = await generateImageWithRetry(enhancedPrompt, LOVABLE_API_KEY, {
          primary: fallbackModel,
          fallback: "google/gemini-3-pro-image-preview",
        });
        imageData = result.imageData;
        modelUsed = `${result.model} (fallback from ${primaryModel})`;
        totalAttempts = result.attempts;
      }
    } else {
      // Lovable AI flow with smart fallback
      const fallbackModel =
        primaryModel === "google/gemini-3-pro-image-preview"
          ? "google/gemini-2.5-flash-image"
          : "google/gemini-3-pro-image-preview";

      try {
        const result = await generateImageWithRetry(enhancedPrompt, LOVABLE_API_KEY, {
          primary: primaryModel,
          fallback: fallbackModel,
        });
        imageData = result.imageData;
        modelUsed = result.model;
        totalAttempts = result.attempts;
      } catch (err) {
        if (err instanceof Error && err.message.startsWith("API_ERROR:")) {
          const statusCode = parseInt(err.message.split(":")[1]);
          if (statusCode === 429) {
            return new Response(
              JSON.stringify({ success: false, error: "Rate limit exceeded. Please try again later." }),
              { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          if (statusCode === 402) {
            return new Response(
              JSON.stringify({
                success: false,
                error: "Payment required. Please add credits to your Lovable AI workspace.",
              }),
              { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
        throw err;
      }
    }

    console.log(`[generate-social-image] Generated with ${modelUsed} after ${totalAttempts} attempt(s)`);

    // ─── Handle PoYo/KIE URL vs Lovable AI base64 ───────────────────────────
    let imageUrl: string;

    if (imageUrlFromPoyo) {
      imageUrl = imageUrlFromPoyo;
      console.log(`[generate-social-image] Using PoYo image URL: ${imageUrl.slice(0, 80)}...`);
    } else if (imageUrlFromKie) {
      imageUrl = imageUrlFromKie;
      console.log(`[generate-social-image] Using KIE image URL: ${imageUrl.slice(0, 80)}...`);
    } else {
      // Lovable AI returns base64 — detect format and upload to storage
      const contentTypeMatch = imageData.match(/^data:image\/([^;]+);base64,/);
      const detectedFormat = contentTypeMatch ? contentTypeMatch[1] : "png";
      const imageMimeType = `image/${detectedFormat}`;
      const fileExtension = detectedFormat === "jpeg" ? "jpg" : detectedFormat;

      const base64Data = imageData.replace(/^data:image\/[^;]+;base64,/, "");
      const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
      console.log(`[generate-social-image] Image bytes: ${imageBytes.length}`);

      const fileName = `${contentId}/${channel}-${Date.now()}.${fileExtension}`;

      const { error: uploadError } = await supabase.storage
        .from("carousel-images")
        .upload(fileName, imageBytes, {
          contentType: imageMimeType,
          upsert: true,
        });

      if (uploadError) {
        console.error("[generate-social-image] Upload error:", uploadError);
        throw new Error(`Failed to upload image: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage.from("carousel-images").getPublicUrl(fileName);
      imageUrl = publicUrlData.publicUrl;
      console.log("[generate-social-image] Image uploaded:", imageUrl);
    }

    // ─── Save to channel_image_history ────────────────────────────────────────
    try {
      await supabase
        .from("channel_image_history")
        .update({ is_selected: false })
        .eq("content_id", contentId)
        .eq("channel", channel);

      const { error: historyError } = await supabase.from("channel_image_history").insert({
        content_id: contentId,
        channel: channel,
        image_url: imageUrl,
        prompt: enhancedPrompt,
        aspect_ratio: finalAspectRatio,
        is_selected: true,
        organization_id: brandTemplate.organization_id,
      });

      if (historyError) {
        console.error("[generate-social-image] Failed to save to history:", historyError);
      } else {
        console.log("[generate-social-image] Saved to channel_image_history");
      }
    } catch (historyErr) {
      console.error("[generate-social-image] History save error:", historyErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl,
        prompt: enhancedPrompt,
        aspectRatio: finalAspectRatio,
        brandColors: {
          primary: brandContext.brandColors?.primary,
          secondary: brandContext.brandColors?.secondary,
        },
        modelUsed,
        attempts: totalAttempts,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[generate-social-image] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
